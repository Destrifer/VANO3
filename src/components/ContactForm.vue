<script setup lang="ts">
// Универсальная форма-заявка: вопрос / прислать макет / заказ — один поток.
// Минимум полей. Файл грузится сразу через /api/upload-doc (отдельно от заявки),
// сама заявка уходит JSON-ом в /api/request. Honeypot от спама.
import { ref, computed, onMounted } from "vue";

// Подписанный токен формы (антиспам: time-trap + nonce). Берём при загрузке.
const token = ref("");
onMounted(async () => {
  try {
    const r = await fetch("/api/form-token");
    const d = await r.json();
    token.value = d.token ?? "";
  } catch {
    /* без токена отправка будет заблокирована — обновление страницы поможет */
  }
});

const name = ref("");
const contact = ref("");
const message = ref("");
const consent = ref(false);
const hp = ref(""); // honeypot — реальный человек не заполняет

// — адаптивное поле контакта: телефон / email / telegram —
type ContactType = "empty" | "phone" | "email" | "tg" | "unknown";

function detectType(v: string): ContactType {
  const s = v.trim();
  if (!s) return "empty";
  if (s.startsWith("@") || /t\.me\//i.test(s)) return "tg";
  if (/^[+\d(]/.test(s)) return "phone";
  if (s.includes("@")) return "email";
  return "unknown";
}

// Маска российского номера: +7 (999) 123-45-67
function formatPhone(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (!d.startsWith("7")) d = "7" + d;
  d = d.slice(0, 11);
  const a = d.slice(1);
  let out = "+7";
  if (a.length) out += " (" + a.slice(0, 3);
  if (a.length >= 3) out += ") " + a.slice(3, 6);
  if (a.length >= 6) out += "-" + a.slice(6, 8);
  if (a.length >= 8) out += "-" + a.slice(8, 10);
  return out;
}

const contactType = computed(() => detectType(contact.value));
const contactValid = computed(() => {
  const s = contact.value.trim();
  switch (contactType.value) {
    case "phone":
      return s.replace(/\D/g, "").length === 11;
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    case "tg":
      return /^@?[a-z0-9_]{3,}$/i.test(s.replace(/^https?:\/\/t\.me\//i, "")) || /t\.me\//i.test(s);
    case "unknown":
      return s.length >= 5; // не блокируем нестандартное — менеджер разберёт
    default:
      return false;
  }
});
const contactHint = computed(() => {
  const ok = contactValid.value;
  switch (contactType.value) {
    case "phone":
      return ok ? "Телефон ✓" : "Телефон — введите 10 цифр";
    case "email":
      return ok ? "Email ✓" : "Похоже на email — проверьте формат";
    case "tg":
      return "Telegram ✓";
    case "unknown":
      return "Укажите телефон, email или @ник";
    default:
      return "";
  }
});

function onContactInput(e: Event) {
  let v = (e.target as HTMLInputElement).value;
  if (detectType(v) === "phone") v = formatPhone(v);
  contact.value = v;
}

const file = ref<{ id: string; name: string } | null>(null);
const uploading = ref(false);
const fileError = ref("");

const sending = ref(false);
const sent = ref(false);
const error = ref("");

const MAX = 20 * 1024 * 1024;

const canSend = computed(
  () =>
    contactValid.value &&
    consent.value &&
    token.value !== "" &&
    !uploading.value &&
    !sending.value,
);

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (!f) return;
  fileError.value = "";
  if (f.size > MAX) {
    fileError.value = "Файл больше 20 МБ";
    input.value = "";
    return;
  }
  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append("file", f, f.name);
    const r = await fetch("/api/upload-doc", { method: "POST", body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Не удалось загрузить файл");
    file.value = { id: d.fileId, name: d.fileName ?? f.name };
  } catch (err) {
    fileError.value = err instanceof Error ? err.message : "Ошибка загрузки";
  } finally {
    uploading.value = false;
    input.value = "";
  }
}

function removeFile() {
  file.value = null;
  fileError.value = "";
}

async function submit() {
  error.value = "";
  if (!contact.value.trim()) {
    error.value = "Укажите, как с вами связаться";
    return;
  }
  if (!contactValid.value) {
    error.value = "Проверьте контакт: телефон, email или @ник в мессенджере";
    return;
  }
  if (!consent.value) {
    error.value = "Нужно согласие на обработку данных";
    return;
  }
  if (!message.value.trim() && !file.value) {
    error.value = "Опишите задачу или приложите файл";
    return;
  }
  if (!token.value) {
    error.value = "Секунду, форма ещё загружается — попробуйте ещё раз";
    return;
  }
  sending.value = true;
  try {
    const r = await fetch("/api/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.value,
        contact: contact.value,
        message: message.value,
        fileId: file.value?.id ?? null,
        fileName: file.value?.name ?? null,
        source: location.pathname,
        hp: hp.value,
        token: token.value,
        consent: consent.value,
      }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Не удалось отправить");
    sent.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Ошибка отправки";
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="cf">
    <div v-if="sent" class="cf-done">
      <h3 class="cf-done__title">Заявка отправлена 🎉</h3>
      <p>Спасибо! Свяжемся с вами в рабочее время — обычно в течение пары часов.</p>
    </div>

    <form v-else class="cf-form" @submit.prevent="submit" novalidate>
      <div class="cf-row">
        <label class="cf-field">
          <span class="cf-label">Имя</span>
          <input v-model="name" class="input w-full" type="text" autocomplete="name" />
        </label>
        <label class="cf-field">
          <span class="cf-label">Как с вами связаться <b>*</b></span>
          <input
            :value="contact"
            @input="onContactInput"
            class="input w-full"
            type="text"
            :inputmode="contactType === 'phone' ? 'tel' : 'text'"
            :autocomplete="contactType === 'email' ? 'email' : contactType === 'phone' ? 'tel' : 'off'"
            :aria-invalid="contactType !== 'empty' && !contactValid ? 'true' : 'false'"
            aria-describedby="contact-hint"
            placeholder="Телефон, email или @ник в мессенджере"
            required
          />
          <span
            v-if="contactHint"
            id="contact-hint"
            class="cf-hint"
            :class="{ 'cf-hint--ok': contactValid }"
            role="status"
            aria-live="polite"
          >{{ contactHint }}</span>
        </label>
      </div>

      <label class="cf-field">
        <span class="cf-label">Что нужно</span>
        <textarea
          v-model="message"
          class="textarea w-full"
          rows="4"
          placeholder="Опишите задачу: что печатаем, тираж, сроки. Или просто приложите макет."
        />
      </label>

      <!-- Файл -->
      <div class="cf-field">
        <span class="cf-label">Макет или файл (по желанию)</span>
        <div v-if="file" class="cf-file">
          <span class="cf-file__name">📎 {{ file.name }}</span>
          <button type="button" class="btn btn-ghost btn-xs" @click="removeFile">убрать</button>
        </div>
        <label v-else class="cf-upload" :class="{ 'cf-upload--busy': uploading }">
          <input
            type="file"
            class="cf-upload__input"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.rtf,.odt"
            :disabled="uploading"
            @change="onFile"
          />
          <span>{{ uploading ? "Загрузка…" : "Выбрать файл (до 20 МБ)" }}</span>
        </label>
        <p v-if="fileError" class="cf-err" role="alert">{{ fileError }}</p>
      </div>

      <!-- Honeypot: скрыто от людей, видно ботам -->
      <div class="cf-hp" aria-hidden="true">
        <label>Не заполняйте это поле
          <input v-model="hp" type="text" tabindex="-1" autocomplete="off" />
        </label>
      </div>

      <label class="cf-consent">
        <input v-model="consent" type="checkbox" class="checkbox checkbox-sm" />
        <span>
          Согласен на обработку персональных данных в соответствии с
          <a href="/privacy" target="_blank" rel="noopener">политикой конфиденциальности</a>.
        </span>
      </label>

      <p v-if="error" class="cf-err" role="alert">{{ error }}</p>

      <!-- Кнопка не блокируется по «невалидности»: при клике покажем, что не так.
           Блокируем только на время реальной отправки/загрузки файла. -->
      <button type="submit" class="btn btn-primary" :disabled="sending || uploading">
        {{ sending ? "Отправляем…" : "Отправить заявку" }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.cf-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.cf-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 620px) {
  .cf-row {
    grid-template-columns: 1fr;
  }
}
.cf-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.cf-label {
  font-size: 0.85rem;
  font-weight: 600;
}
.cf-label b {
  color: var(--color-primary, #e5484d);
}
.cf-upload {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.7rem 1rem;
  border: 1px dashed var(--color-base-300);
  border-radius: var(--radius-field, 0.5rem);
  cursor: pointer;
  font-size: 0.92rem;
  color: color-mix(in oklch, var(--color-base-content) 75%, transparent);
}
.cf-upload:hover {
  background: var(--color-base-200);
}
.cf-upload--busy {
  opacity: 0.6;
  pointer-events: none;
}
.cf-upload__input {
  display: none;
}
.cf-file {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--color-base-300);
  border-radius: var(--radius-field, 0.5rem);
}
.cf-file__name {
  font-size: 0.92rem;
  word-break: break-all;
}
.cf-consent {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  font-size: 0.88rem;
  line-height: 1.4;
}
.cf-err {
  color: var(--color-error, #d92d20);
  font-size: 0.88rem;
}
.cf-hint {
  font-size: 0.8rem;
  color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
}
.cf-hint--ok {
  color: #2fb344;
}
.cf-done {
  padding: 1.5rem;
  border: 1px solid var(--color-base-300);
  border-radius: var(--radius-box, 1rem);
  background: var(--color-base-200);
}
.cf-done__title {
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 0.4rem;
}
/* honeypot — вне потока, недоступно людям */
.cf-hp {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
</style>
