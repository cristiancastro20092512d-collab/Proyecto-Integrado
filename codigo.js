document.addEventListener('DOMContentLoaded', function () {
    var vistas = document.querySelectorAll('.vista');
    var formularioRegistro = document.getElementById('formularioRegistro');
    var formularioLogin = document.getElementById('formularioLogin');
    var errorRegistro = document.getElementById('errorRegistro');
    var errorLogin = document.getElementById('errorLogin');
    var okRegistro = document.getElementById('okRegistro');
    var claveAlmacenamiento = 'solvantaUsuarios';
    var iteraciones = 310000;

    function mostrarVista(id) {
        vistas.forEach(function (vista) {
            vista.classList.add('oculto');
        });

        document.getElementById(id).classList.remove('oculto');
    }

    function obtenerUsuarios() {
        var usuariosGuardados = window.localStorage.getItem(claveAlmacenamiento);

        if (usuariosGuardados === null) {
            return [];
        }

        var usuarios = JSON.parse(usuariosGuardados);
        if (!Array.isArray(usuarios)) {
            throw new Error('Los datos de las cuentas guardadas no son válidos.');
        }

        return usuarios;
    }

    function codificarBase64(bytes) {
        return btoa(Array.from(bytes, function (byte) {
            return String.fromCharCode(byte);
        }).join(''));
    }

    async function generarHash(clave, sal) {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('La verificación segura requiere abrir la página desde HTTPS o localhost.');
        }

        var claveImportada = await window.crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(clave),
            'PBKDF2',
            false,
            ['deriveBits']
        );
        var hash = await window.crypto.subtle.deriveBits({
            name: 'PBKDF2',
            salt: sal,
            iterations: iteraciones,
            hash: 'SHA-256'
        }, claveImportada, 256);

        return codificarBase64(new Uint8Array(hash));
    }

    function mostrarError(elemento, mensaje) {
        elemento.textContent = mensaje;
        elemento.classList.remove('oculto');
    }

    document.querySelectorAll('[data-vista]').forEach(function (boton) {
        boton.addEventListener('click', function () {
            mostrarVista(boton.getAttribute('data-vista'));
        });
    });

    formularioRegistro.addEventListener('submit', async function (evento) {
        evento.preventDefault();
        errorRegistro.classList.add('oculto');
        okRegistro.classList.add('oculto');

        var clave = document.getElementById('regClave').value;
        var confirmarClave = document.getElementById('regClave2').value;
        var correo = document.getElementById('regCorreo').value.trim().toLowerCase();

        if (clave !== confirmarClave) {
            mostrarError(errorRegistro, 'Las contraseñas no coinciden.');
            document.getElementById('regClave2').focus();
            return;
        }

        try {
            var usuarios = obtenerUsuarios();
            if (usuarios.some(function (usuario) {
                return usuario.correo === correo;
            })) {
                mostrarError(errorRegistro, 'Ya existe una cuenta con ese correo electrónico.');
                document.getElementById('regCorreo').focus();
                return;
            }

            var sal = window.crypto.getRandomValues(new Uint8Array(16));
            usuarios.push({
                nombre: document.getElementById('regNombre').value.trim(),
                correo: correo,
                sal: codificarBase64(sal),
                hashClave: await generarHash(clave, sal)
            });
            window.localStorage.setItem(claveAlmacenamiento, JSON.stringify(usuarios));

            document.getElementById('loginCorreo').value = correo;
            document.getElementById('loginClave').value = '';
            okRegistro.textContent = 'Cuenta creada. Inicia sesión para continuar.';
            okRegistro.classList.remove('oculto');
            mostrarVista('vistaLogin');
        } catch (error) {
            mostrarError(errorRegistro, error.message || 'No se pudo crear la cuenta. Inténtalo de nuevo.');
        }
    });

    formularioLogin.addEventListener('submit', async function (evento) {
        evento.preventDefault();
        errorLogin.classList.add('oculto');

        var correo = document.getElementById('loginCorreo').value.trim().toLowerCase();
        var clave = document.getElementById('loginClave').value;

        try {
            var usuario = obtenerUsuarios().find(function (cuenta) {
                return cuenta.correo === correo;
            });

            if (!usuario) {
                mostrarError(errorLogin, 'No existe una cuenta con ese correo. Crea una cuenta para continuar.');
                return;
            }

            var sal = Uint8Array.from(atob(usuario.sal), function (caracter) {
                return caracter.charCodeAt(0);
            });
            if (await generarHash(clave, sal) !== usuario.hashClave) {
                mostrarError(errorLogin, 'La contraseña es incorrecta.');
                return;
            }

            window.location.href = 'Pagina-Inicio.html';
        } catch (error) {
            mostrarError(errorLogin, error.message || 'No se pudo iniciar sesión. Inténtalo de nuevo.');
        }
    });
});
