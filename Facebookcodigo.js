const highlights = [
  { img: "img/h1.jpg", label: "Instalaciones", n: 24 },
  { img: "img/h2.jpg", label: "Granjas solares", n: 12 },
  { img: "img/cover.jpg", label: "Proyectos", n: 38 },
];

const clients = [
  { name: "Familia López", time: "Hace 2 días" },
  { name: "Café Central", time: "Hace 1 sem" },
  { name: "Hotel Sol", time: "Hace 3 sem" },
  { name: "Escuela Verde", time: "Hace 1 mes" },
];

const navItems = [
  ["home", "Inicio"], ["play-circle", "Videos"], ["store", "Tienda"],
  ["users", "Clientes"], ["bell", "Avisos"], ["menu", "Menú"],
];

// Destacados
const hl = document.getElementById("highlights");
highlights.forEach((h) => {
  hl.insertAdjacentHTML("beforeend", `
    <div class="hl">
      <div class="hl-box"><img src="${h.img}" alt="${h.label}" loading="lazy"><span class="count">+ ${h.n}</span></div>
      <span class="label">${h.label}</span>
    </div>`);
});

// Clientes
const cl = document.getElementById("clients");
clients.forEach((c) => {
  cl.insertAdjacentHTML("beforeend", `
    <div class="client">
      <div class="circle">${c.name[0]}</div>
      <span class="name">${c.name}</span>
      <span class="time">${c.time}</span>
    </div>`);
});

// Menú inferior
const nav = document.getElementById("nav");
nav.innerHTML = `<div class="inner">${navItems
  .map(([icon, label], i) => `<div class="nav-item${i === 0 ? " active" : ""}"><i data-lucide="${icon}"></i>${label}</div>`)
  .join("")}</div>`;
nav.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    nav.querySelectorAll(".nav-item").forEach((x) => x.classList.remove("active"));
    item.classList.add("active");
  });
});

// Pestañas
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
  });
});

// Botones
document.getElementById("btnCotizar").addEventListener("click", () => {
  alert("¡Gracias! Pronto te contactaremos para tu cotización solar ☀️");
});
document.getElementById("btnMensaje").addEventListener("click", () => {
  alert("Escríbenos y con gusto te atendemos.");
});

// Íconos
lucide.createIcons();
