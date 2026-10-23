document.querySelectorAll('.filtros button').forEach(function (boton) {
    boton.addEventListener('click', function () {
        document.querySelector('.filtros .activo').classList.remove('activo');
        boton.classList.add('activo');

        var filtro = boton.dataset.filtro;
        document.querySelectorAll('.card-col').forEach(function (col) {
            var coincide = filtro === 'todos' || col.dataset.categoria.split(' ').includes(filtro);
            col.classList.toggle('oculto', !coincide);
        });
    });
});