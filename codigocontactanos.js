function mostrarMapa() {
    var mapa = document.getElementById('cuadro-mapa');
    if (mapa.style.display === "none") {
      mapa.style.display = "block";
    } else {
      mapa.style.display = "none";
    }
  }