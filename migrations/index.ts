import * as migration_20260927_173840_initial from './20260927_173840_initial';
import * as migration_20260928_032821_drop_media from './20260928_032821_drop_media';

export const migrations = [
  {
    up: migration_20260927_173840_initial.up,
    down: migration_20260927_173840_initial.down,
    name: '20260927_173840_initial',
  },
  {
    up: migration_20260928_032821_drop_media.up,
    down: migration_20260928_032821_drop_media.down,
    name: '20260928_032821_drop_media'
  },
];
