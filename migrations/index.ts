import * as migration_20260927_173840_initial from './20260927_173840_initial';

export const migrations = [
  {
    up: migration_20260927_173840_initial.up,
    down: migration_20260927_173840_initial.down,
    name: '20260927_173840_initial'
  },
];
