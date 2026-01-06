module.exports = {
  root: true,
  extends: [require.resolve("@bibleclips/config/eslint")],
  parserOptions: {
    project: "./tsconfig.json",
  },
};
