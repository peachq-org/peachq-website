const form = document.getElementById("contactForm");
const nameInput = document.getElementById("contactName");
const subjectInput = document.getElementById("contactSubject");
const emailInput = document.getElementById("contactEmail");
const messageInput = document.getElementById("contactMessage");
const submitButton = document.getElementById("contactSubmit");
const hint = document.getElementById("contactHint");
const statusBox = document.getElementById("contactStatus");
const sentBox = document.getElementById("contactSent");
const templateButtons = Array.from(document.querySelectorAll("[data-contact-template]"));

const templates = {
  bug: {
    subject: "PeachQ bug report",
    message: [
      "What happened?",
      "",
      "What did you expect?",
      "",
      "REPL transcript:",
      "q)",
      "",
      "Browser / OS:",
      ""
    ].join("\n"),
    hint: "GitHub issues are still preferred for public, reproducible bugs."
  },
  private: {
    subject: "Private PeachQ contact",
    message: [
      "Please use this only for private details that should not be public.",
      "",
      "Message:",
      "",
      "Reply email:",
      ""
    ].join("\n"),
    hint: "For ordinary bugs and questions, GitHub issues or discussions are better."
  }
};

let activeTemplate = "bug";
let userEditedSubject = false;
let userEditedMessage = false;

function setTemplate(name, force = false) {
  activeTemplate = templates[name] ? name : "bug";
  const template = templates[activeTemplate];
  document.documentElement.dataset.contactTemplate = activeTemplate;
  templateButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.contactTemplate === activeTemplate));
  });
  if (force || !userEditedSubject) {
    subjectInput.value = template.subject;
  }
  if (force || !userEditedMessage) {
    messageInput.value = template.message;
  }
  submitButton.textContent = "Send message";
  hint.textContent = template.hint;
}

function applyQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const template = params.get("template") || params.get("type");
  let hasPrefill = false;
  if (template) {
    setTemplate(template, true);
  }
  const subject = params.get("subject");
  const message = params.get("message") || params.get("details") || params.get("body");
  const name = params.get("name");
  const email = params.get("email");
  if (subject) {
    subjectInput.value = subject;
    userEditedSubject = true;
    hasPrefill = true;
  }
  if (message) {
    messageInput.value = message;
    userEditedMessage = true;
    hasPrefill = true;
  }
  if (name) {
    nameInput.value = name;
    hasPrefill = true;
  }
  if (email) {
    emailInput.value = email;
    hasPrefill = true;
  }
  if (hasPrefill) {
    window.requestAnimationFrame(() => {
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      messageInput.focus({ preventScroll: true });
    });
  }
}

templateButtons.forEach(button => {
  button.addEventListener("click", () => setTemplate(button.dataset.contactTemplate, true));
});

subjectInput.addEventListener("input", () => {
  userEditedSubject = true;
});

messageInput.addEventListener("input", () => {
  userEditedMessage = true;
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  statusBox.className = "form-status";
  statusBox.textContent = "Sending...";
  submitButton.disabled = true;
  const formData = new FormData(form);
  formData.set("template", activeTemplate);
  formData.set("subject", subjectInput.value.trim() || templates[activeTemplate].subject);
  formData.set("msgbody", [
    "PeachQ website contact",
    "template: " + activeTemplate,
    "name: " + nameInput.value.trim(),
    "email: " + emailInput.value.trim(),
    "",
    "txt:",
    messageInput.value.trim()
  ].join("\n"));
  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: formData,
      headers: { "Accept": "application/json" }
    });
    const result = await response.json();
    if (result.type === "success") {
      statusBox.className = "form-status success";
      statusBox.textContent = "Message sent.";
      if (sentBox) {
        sentBox.hidden = false;
        sentBox.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      form.classList.add("is-sent");
      form.setAttribute("aria-hidden", "true");
      form.reset();
      userEditedSubject = false;
      userEditedMessage = false;
    } else {
      statusBox.className = "form-status error";
      statusBox.textContent = result.message || "Message could not be sent.";
    }
  } catch (_err) {
    statusBox.className = "form-status error";
    statusBox.textContent = "Message could not be sent.";
  } finally {
    submitButton.disabled = false;
  }
});

setTemplate("bug", true);
applyQueryParams();
