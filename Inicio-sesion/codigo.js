document.addEventListener('DOMContentLoaded', function () {
    var vistas = document.querySelectorAll('.vista');
    var formularioRegistro = document.getElementById('formularioRegistro');
    var formularioLogin = document.getElementById('formularioLogin');
    var errorRegistro = document.getElementById('errorRegistro');
    var okRegistro = document.getElementById('okRegistro');

    function mostrarVista(id) {
        vistas.forEach(function (vista) {
            vista.classList.add('oculto');
        });

        document.getElementById(id).classList.remove('oculto');
    }

    document.querySelectorAll('[data-vista]').forEach(function (boton) {
        boton.addEventListener('click', function () {
            mostrarVista(boton.getAttribute('data-vista'));
        });
    });

    formularioRegistro.addEventListener('submit', function (evento) {
        evento.preventDefault();
        errorRegistro.classList.add('oculto');

        var clave = document.getElementById('regClave').value;
        var confirmarClave = document.getElementById('regClave2').value;

        if (clave !== confirmarClave) {
            errorRegistro.textContent = 'Las contraseñas no coinciden.';
            errorRegistro.classList.remove('oculto');
            document.getElementById('regClave2').focus();
            return;
        }

        document.getElementById('loginCorreo').value = document.getElementById('regCorreo').value;
        document.getElementById('loginClave').value = '';
        okRegistro.textContent = 'Datos verificados. Inicia sesión para continuar.';
        okRegistro.classList.remove('oculto');
        mostrarVista('vistaLogin');
    });

    formularioLogin.addEventListener('submit', function (evento) {
        evento.preventDefault();
        window.location.href = '../Pagina-Inicio.html';
    });
});
