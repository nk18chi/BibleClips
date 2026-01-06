module.exports = {
  extends: ["@bibleclips/config/eslint", "next/core-web-vitals"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};
