# Financi

Panel financiero creado con Vue 3 + PrimeVue + Tailwind CSS sobre Vite.

## Requisitos
- Node.js 18+
- npm 9+

## Scripts
- `npm install` – instala dependencias
- `npm run dev` – abre el servidor de desarrollo en modo hot-module
- `npm run build` – compila el proyecto (incluye `vue-tsc` para type-check)
- `npm run preview` – sirve la compilación generada

## Stack
- **Vue 3 + `<script setup>`** para la capa de componentes
- **PrimeVue 4** con tema Aura (`@primeuix/themes`) para componentes UI
- **Tailwind CSS 3** para layout utilitario y tokens personalizados

## Estructura destacada
- `src/main.ts` registra PrimeVue, carga el tema Aura y los estilos globales
- `src/style.css` inicializa Tailwind y define capas utilitarias compartidas
- `src/App.vue` contiene el dashboard demo que combina componentes PrimeVue y utilidades Tailwind

## Personalización
- Edita `tailwind.config.js` para agregar tokens o diseños propios.
- Registra cualquier componente de PrimeVue adicional importándolo en el `<script setup>` correspondiente.

## Lanzar producción
1. `npm run build`
2. `npm run preview`
3. Despliega el contenido de `dist/` en tu plataforma preferida.
