export const spacing = {
  // Base spacing unit (4px)
  unit: 4,

  // Predefined spacing values
  xxs: 2,
  xs: 4,
  sm: 8,
  smd: 10,
  smx: 12,
  md: 16,
  md18: 18,
  mlg: 20,
  lg: 24,
  lgx: 30,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Function to get custom spacing (in units of 4px)
  get: (multiplier: number) => multiplier * 4,
};
