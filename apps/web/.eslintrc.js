module.exports = {
  extends: [require.resolve("@bibleclips/config/eslint"), "next/core-web-vitals"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};
