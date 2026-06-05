import js from '@eslint/js'
import globals from 'globals'

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node, // Esto le dice a ESLint que estás en Node.js (reconoce 'process', '__dirname', etc.)
      },
    },
    rules: {
      'no-unused-vars': 'warn', // Te avisa si dejas variables sin usar
      'no-console': 'off', // Te permite usar console.log en Express sin que falle
    },
  },
]
