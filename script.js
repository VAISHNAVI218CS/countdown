const eventNameInput = document.querySelector("#event-name");
const eventDateInput = document.querySelector("#event-date");
const eventList = document.querySelector("#event-list");
const eventCount = document.querySelector("#event-count");
const addEventForm = document.querySelector("#add-event-form");
const eventTemplate = document.querySelector("#event-card-template");
const presetButtons = document.querySelectorAll(".preset");
const currentDateText = document.querySelector("#current-date");

const storageKey = "daymark-events";
const legacyStorageKey = "daymark-countdown";
const defaultEvent = { id: "default-dasara", name: "Dasara", date: "2026-10-20T00:00" };
const displayOptions = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
const eventDateOptions = { ...displayOptions, hour: "numeric", minute: "2-digit" };
let events = readEvents();

function createEventId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readEvents() {
  try {
    const savedEvents = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(savedEvents)) {
      return savedEvents.filter((event) => event && typeof event.name === "string" && typeof event.date === "string")
        .map((event) => ({ ...event, id: typeof event.id === "string" ? event.id : createEventId() }));
    }

    const previousEvent = JSON.parse(localStorage.getItem(legacyStorageKey));
    if (previousEvent && typeof previousEvent.name === "string" && typeof previousEvent.date === "string") {
      return [{ id: createEventId(), name: previousEvent.name, date: previousEvent.date }];
    }
  } catch {
    // Ignore invalid or unavailable saved data and use the default event.
  }
  return [{ ...defaultEvent }];
}

function saveEvents() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(events));
  } catch {
    // The countdowns still work when browser storage is unavailable.
  }
}

function updateCurrentDate() {
  currentDateText.textContent = new Date().toLocaleDateString(undefined, displayOptions);
}

function updatePresetState(name) {
  presetButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.event === name);
  });
}

function renderEvents() {
  eventList.replaceChildren();
  const sortedEvents = [...events].sort((first, second) => new Date(first.date) - new Date(second.date));
  eventCount.textContent = `${events.length} ${events.length === 1 ? "EVENT" : "EVENTS"}`;

  if (sortedEvents.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "Your next moment starts here.";
    eventList.append(emptyState);
    return;
  }

  sortedEvents.forEach((event) => {
    const card = eventTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.eventId = event.id;
    card.querySelector(".event-card-title").textContent = event.name;
    const eventDate = new Date(event.date);
    card.querySelector(".event-card-date").textContent = Number.isNaN(eventDate.getTime())
      ? "Choose a valid date"
      : eventDate.toLocaleString(undefined, eventDateOptions);

    const removeButton = card.querySelector(".remove-event");
    removeButton.setAttribute("aria-label", `Remove ${event.name} countdown`);
    removeButton.title = `Remove ${event.name}`;
    removeButton.addEventListener("click", () => {
      events = events.filter((savedEvent) => savedEvent.id !== event.id);
      saveEvents();
      renderEvents();
    });

    eventList.append(card);
  });
  updateCountdowns();
}

function updateCountdowns() {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  eventList.querySelectorAll(".event-card").forEach((card) => {
    const event = eventsById.get(card.dataset.eventId);
    if (!event) return;

    const difference = new Date(event.date).getTime() - Date.now();
    const status = card.querySelector(".event-card-status");
    if (!Number.isFinite(difference) || difference <= 0) {
      card.querySelector('[data-unit="days"]').textContent = "000";
      card.querySelector('[data-unit="hours"]').textContent = "00";
      card.querySelector('[data-unit="minutes"]').textContent = "00";
      card.querySelector('[data-unit="seconds"]').textContent = "00";
      status.textContent = difference > -60_000 ? "The moment is here!" : "This event has passed.";
      return;
    }

    const totalSeconds = Math.floor(difference / 1000);
    card.querySelector('[data-unit="days"]').textContent = String(Math.floor(totalSeconds / 86_400)).padStart(3, "0");
    card.querySelector('[data-unit="hours"]').textContent = String(Math.floor((totalSeconds % 86_400) / 3_600)).padStart(2, "0");
    card.querySelector('[data-unit="minutes"]').textContent = String(Math.floor((totalSeconds % 3_600) / 60)).padStart(2, "0");
    card.querySelector('[data-unit="seconds"]').textContent = String(totalSeconds % 60).padStart(2, "0");
    status.textContent = "Time until this moment.";
  });
}

eventNameInput.addEventListener("input", () => updatePresetState(eventNameInput.value.trim()));
addEventForm.addEventListener("submit", (submitEvent) => {
  submitEvent.preventDefault();
  const name = eventNameInput.value.trim();
  if (!name || !eventDateInput.value) return;

  events.push({ id: createEventId(), name, date: eventDateInput.value });
  saveEvents();
  renderEvents();
  addEventForm.reset();
  updatePresetState("");
  eventNameInput.focus();
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    eventNameInput.value = button.dataset.event;
    updatePresetState(button.dataset.event);
    eventNameInput.focus();
  });
});

updateCurrentDate();
renderEvents();
saveEvents();
window.setInterval(updateCountdowns, 1000);
window.setInterval(updateCurrentDate, 60_000);