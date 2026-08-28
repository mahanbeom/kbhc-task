import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'src/routeTree.gen.ts', 'public/mockServiceWorker.js'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  // 반드시 마지막: Prettier와 충돌하는 스타일 규칙을 끈다
  prettier,
);
