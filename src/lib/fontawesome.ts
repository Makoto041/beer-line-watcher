// Font Awesome configuration for Next.js
import { config, library } from '@fortawesome/fontawesome-svg-core';
import {
  faBeerMugEmpty,
  faCalendarDays,
  faWineGlass,
  faTent,
  faMagnifyingGlass,
  faStar,
  faFire,
  faCaretRight,
  faChampagneGlasses,
  faCircle,
} from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

// Prevent Font Awesome from adding its CSS since we imported it above
config.autoAddCss = false;

// Add icons to the library so they can be used throughout the app
library.add(
  faBeerMugEmpty,
  faCalendarDays,
  faWineGlass,
  faTent,
  faMagnifyingGlass,
  faStar,
  faFire,
  faCaretRight,
  faChampagneGlasses,
  faCircle,
);

// Icon map for source types
export const SOURCE_ICONS = {
  'beergirl-calendar': faBeerMugEmpty,
  'alwayslovebeer-calendar': faCalendarDays,
  'walkerplus-liquor-kanto': faWineGlass,
  'beerfestival-info': faTent,
} as const;

export {
  faBeerMugEmpty,
  faCalendarDays,
  faWineGlass,
  faTent,
  faMagnifyingGlass,
  faStar,
  faFire,
  faCaretRight,
  faChampagneGlasses,
  faCircle,
};
