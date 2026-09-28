import * as migration_20260927_173840_initial from './20260927_173840_initial';
import * as migration_20260928_032821_drop_media from './20260928_032821_drop_media';
import * as migration_20260928_190117_interface_copy from './20260928_190117_interface_copy';
import * as migration_20260928_204542_contact_lines from './20260928_204542_contact_lines';

export const migrations = [
  {
    up: migration_20260927_173840_initial.up,
    down: migration_20260927_173840_initial.down,
    name: '20260927_173840_initial',
  },
  {
    up: migration_20260928_032821_drop_media.up,
    down: migration_20260928_032821_drop_media.down,
    name: '20260928_032821_drop_media',
  },
  {
    up: migration_20260928_190117_interface_copy.up,
    down: migration_20260928_190117_interface_copy.down,
    name: '20260928_190117_interface_copy',
  },
  {
    up: migration_20260928_204542_contact_lines.up,
    down: migration_20260928_204542_contact_lines.down,
    name: '20260928_204542_contact_lines'
  },
];
