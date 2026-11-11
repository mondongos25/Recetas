function iniciarApp() {

    // Selecciona el contenedor principal donde se mostrarán los resultados de recetas
    const resultado = document.querySelector('#resultado');

    // Selecciona el elemento <select> de categorías en el DOM
    const selectCategorias = document.querySelector('#categorias');
    if(selectCategorias) {
        // Escucha cambios en el selector para activar la función de filtrado
        selectCategorias.addEventListener('change', seleccionarCategoria);
        // Carga inicial de categorías desde la API al iniciar la aplicación
        obtenerCategorias();
    }

    // Selecciona el contenedor exclusivo de la vista de favoritos
    const favoritosDiv = document.querySelector('.favoritos');
    if(favoritosDiv) {
        // Si existe en el DOM actual, recupera y muestra las recetas guardadas
        obtenerFavoritos();
    }

    // Inicializa la instancia del componente Modal de Bootstrap
    const modal = new bootstrap.Modal('#modal', {});

    // Función para obtener las categorías de comida desde la API pública de TheMealDB
    function obtenerCategorias() {
        const url = 'https://www.themealdb.com/api/json/v1/1/categories.php';
        fetch(url)
            .then(respuesta => respuesta.json())
            .then(resultado => msotrarCategorias(resultado.categories));
    }

    // Renderiza las opciones de categorías dentro del elemento <select>
    function msotrarCategorias(categorias = []) {
        categorias.forEach(categoria => {
            const { strCategory } = categoria;
            const option = document.createElement('OPTION');
            option.value = strCategory;
            option.textContent = strCategory;
            selectCategorias.appendChild(option);     
        });
    }

    // Maneja el evento de cambio de categoría para consultar recetas filtradas
    function seleccionarCategoria(e) {
        const categoria = e.target.value;
        const url = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${categoria}`;
        fetch(url)
            .then(respuesta => respuesta.json())
            .then(resultado => mostrarRecetas(resultado.meals));
    }

    // Renderiza las tarjetas de recetas en el DOM
    function mostrarRecetas(recetas = []) {
        limpiarHtml(resultado); // Limpia resultados previos antes de pintar nuevos

        const heading = document.createElement('H2');
        heading.classList.add('text-center', 'text-black', 'my-5');
        heading.textContent = recetas.length ? 'Resultados' : 'No Hay Resultados';
        resultado.appendChild(heading);
        
        // Itera sobre cada receta devuelta por la API
        recetas.forEach(receta => {
            const { idMeal, strMeal, strMealThumb } = receta;

            const recetaContenedor = document.createElement('DIV');
            recetaContenedor.classList.add('col-md-4');

            const recetaCard = document.createElement('DIV');
            recetaCard.classList.add('card', 'mb-4');

            const recetaImagen = document.createElement('IMG');
            recetaImagen.classList.add('card-img-top');
            recetaImagen.alt = `Imagen de la receta ${strMeal ?? receta.titulo}`;
            recetaImagen.src = strMealThumb ?? receta.img;

            const recetaCardBody = document.createElement('DIV');
            recetaCardBody.classList.add('card-body');

            const recetaHeading = document.createElement('H3');
            recetaHeading.classList.add('card-title', 'mb-3');
            recetaHeading.textContent = strMeal ?? receta.titulo;

            const recetaButton = document.createElement('BUTTON');
            recetaButton.classList.add('btn', 'btn-danger', 'w-100');
            recetaButton.textContent = 'Ver Receta';
            // Evento click para consultar los detalles completos de la receta seleccionada
            recetaButton.onclick = function() {
                seleccionarReceta(idMeal ?? receta.id);
            }

            // Inyecta los elementos hijos dentro de la tarjeta y el contenedor principal
            recetaCardBody.appendChild(recetaHeading);
            recetaCardBody.appendChild(recetaButton);
            recetaCard.appendChild(recetaImagen);
            recetaCard.appendChild(recetaCardBody);
            recetaContenedor.appendChild(recetaCard);
            resultado.appendChild(recetaContenedor);
        });
    }

    // Consulta los detalles específicos de una receta mediante su ID único
    function seleccionarReceta(id) {
        const url = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`;
        fetch(url)
            .then(respuesta => respuesta.json())
            .then(resultado => mostrarRecetaModal(resultado.meals[0]));
    }

    // Construye y despliega el contenido dinámico dentro del modal
    function mostrarRecetaModal(receta) {
        const { idMeal, strInstructions, strMeal, strMealThumb } = receta;
        
        const modalTitle = document.querySelector('.modal .modal-title');
        const modalBody = document.querySelector('.modal .modal-body');

        modalTitle.textContent = strMeal;
        modalBody.innerHTML = `
            <img class="img-fluid" src="${strMealThumb}" alt="receta ${strMeal}" />
            <h3 class="my-3">Instrucciones</h3>
            <p>${strInstructions}</p>
            <h3 class="my-3">Ingredientes y Cantidades</h3>
        `;

        const listGroup = document.createElement('UL');
        listGroup.classList.add('list-group');
        
        // Itera para extraer hasta 20 ingredientes y cantidades dinámicamente de la API
        for(let i = 1; i <= 20; i++ ) {
            if(receta[`strIngredient${i}`]) {
                const ingrediente = receta[`strIngredient${i}`];
                const cantidad = receta[`strMeasure${i}`];

                const ingredienteLi = document.createElement('LI');
                ingredienteLi.classList.add('list-group-item');
                ingredienteLi.textContent = `${ingrediente} - ${cantidad}`;

                listGroup.appendChild(ingredienteLi);
            }
        }

        modalBody.appendChild(listGroup);

        const modalFooter = document.querySelector('.modal-footer');
        limpiarHtml(modalFooter);

        // Crea el botón dinámico de Guardar / Eliminar de Favoritos
        const btnFavorito = document.createElement('BUTTON');
        btnFavorito.classList.add('btn', 'btn-danger', 'col');
        btnFavorito.textContent = existeStorage(idMeal) ? 'Eliminar Favorito' : 'Guardar Favorito';

        // Lógica de persistencia con localStorage al hacer clic en favorito
        btnFavorito.onclick = function() {
            if(existeStorage(idMeal)) {
                eliminarFavorito(idMeal);
                btnFavorito.textContent = 'Guardar Favorito';
                mostrarToast('Eliminado Correctamente');
                return;
            }

            agregarFavorito({
                id: idMeal,
                titulo: strMeal,
                img: strMealThumb 
            });
            btnFavorito.textContent = 'Eliminar Favorito';
            mostrarToast('Agregado Correctamente');
        }

        // Crea el botón para cerrar el modal
        const btnCerrarModal = document.createElement('BUTTON');
        btnCerrarModal.classList.add('btn', 'btn-secondary', 'col');
        btnCerrarModal.textContent = 'Cerrar';
        btnCerrarModal.onclick = function() {
            modal.hide();
        }

        modalFooter.appendChild(btnFavorito);
        modalFooter.appendChild(btnCerrarModal);

        // Muestra el modal en pantalla utilizando la instancia de Bootstrap
        modal.show();
    }

    // Agrega una receta al almacenamiento local (localStorage)
    function agregarFavorito(receta) {
        const favoritos = JSON.parse(localStorage.getItem('favoritos')) ?? [];
        localStorage.setItem('favoritos', JSON.stringify([...favoritos, receta]));
    }

    // Elimina una receta de localStorage según su ID
    function eliminarFavorito(id) {
        const favoritos = JSON.parse(localStorage.getItem('favoritos')) ?? [];
        const nuevosFavoritos = favoritos.filter(favorito => favorito.id !== id);
        localStorage.setItem('favoritos', JSON.stringify(nuevosFavoritos));
    }

    // Verifica si una receta ya se encuentra guardada en localStorage
    function existeStorage(id) {
        const favoritos = JSON.parse(localStorage.getItem('favoritos')) ?? [];
        return favoritos.some(favorito => favorito.id === id);
    }

    // Muestra una notificación emergente tipo Toast en la esquina superior
    function mostrarToast(mensaje) {
        const toastDiv = document.querySelector('#toast');
        const toastBody = document.querySelector('.toast-body');
        const toast = new bootstrap.Toast(toastDiv);
        toastBody.textContent = mensaje;
        toast.show();
    }

    // Recupera y muestra los favoritos guardados al cargar la vista correspondiente
    function obtenerFavoritos() {
        const favoritos = JSON.parse(localStorage.getItem('favoritos')) ?? [];
        if(favoritos.length) {
            mostrarRecetas(favoritos);
            return;
        } 

        const noFavoritos = document.createElement('P');
        noFavoritos.textContent = 'No hay favoritos aún';
        noFavoritos.classList.add('fs-4', 'text-center', 'font-bold', 'mt-5');
        favoritosDiv.appendChild(noFavoritos);
    }

    // Función auxiliar para limpiar el contenido HTML previo de un selector
    function limpiarHtml(selector) {
        while(selector.firstChild) {
            selector.removeChild(selector.firstChild);
        }
    }
}

// Escucha a que todo el DOM esté cargado para inicializar la aplicación de manera segura
document.addEventListener('DOMContentLoaded', iniciarApp);

