module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'transform-inline-environment-variables',
      {
        include: ['API_BASE_URL', 'REACT_NATIVE_API_BASE_URL'],
      },
    ],
  ],
};
