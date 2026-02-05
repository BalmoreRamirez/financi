# Financi - Instrucciones de Proyecto

## Stack Tecnológico
- Vue 3 + TypeScript
- Vite (build tool)
- PrimeVue (componentes UI)
- Tailwind CSS (estilos)
- Pinia (gestión de estado)
- Vue Router

## Estructura del Proyecto
- `src/views/` - Vistas principales (Dashboard, Accounts, Credits, Investments)
- `src/stores/finance.ts` - Store central con toda la lógica financiera
- `src/router/` - Configuración de rutas
- `src/components/` - Componentes reutilizables

## Reglas de Negocio Implementadas
- RN-01: No se pueden eliminar transacciones confirmadas
- RN-02: Créditos no pueden cerrarse con saldo pendiente
- RN-03: Inversiones solo generan ganancia al venderse
- RN-04: Ingresos deben impactar cuenta de efectivo/banco
- RN-05: Ganancias respaldadas por transacciones

## Tipos de Cuenta
- Activo, Pasivo, Ingreso, Gasto, Capital

## Comandos
- `npm run dev` - Desarrollo
- `npm run build` - Compilar
- `npm run preview` - Vista previa de producción

TASK COMPLETION RULES:
- Your task is complete when:
  - Project is successfully scaffolded and compiled without errors
  - copilot-instructions.md file in the .github directory exists in the project
  - README.md file exists and is up to date
  - User is provided with clear instructions to debug/launch the project

Before starting a new task in the above plan, update progress in the plan.
-->
- Work through each checklist item systematically.
- Keep communication concise and focused.
- Follow development best practices.
