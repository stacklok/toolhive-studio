# React + TypeScript + Vite

> [!NOTE]  
> This is just preliminary work to put the React user interface in place for the
> larger ToolHive Studio project. This is probably a temporary repository.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Getting Started

This project uses [pnpm](https://pnpm.io/) as the package manager. If you don't have pnpm installed, check the [doc](https://pnpm.io/installation).

### Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (with hot reload)
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Generate API client from OpenAPI spec
pnpm run generate-client

# Run tests
pnpm run test

# Run tests with coverage
pnpm run test:coverage

# Run linting
pnpm run lint

# Run type checking
pnpm run type-check

# Format code with Prettier
pnpm run format

# Check Prettier formatting
pnpm run prettier
```

### Development Workflow

1. **Install dependencies**: `pnpm install`
2. **Start development server**: `pnpm run dev`
3. **Open your browser** to `http://localhost:5173` (or the port shown in terminal)
4. **Make changes** to your code and see them reflected instantly with Hot Module Replacement (HMR)

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    "react-x": reactX,
    "react-dom": reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs["recommended-typescript"].rules,
    ...reactDom.configs.recommended.rules,
  },
});
```
