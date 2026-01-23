"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
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
} from "@fortawesome/free-solid-svg-icons";

// Prevent Font Awesome from dynamically adding CSS
config.autoAddCss = false;

// Icon name to FontAwesome icon mapping
const iconMap: Record<string, IconDefinition> = {
  beer: faBeerMugEmpty,
  calendar: faCalendarDays,
  wine: faWineGlass,
  tent: faTent,
  search: faMagnifyingGlass,
  star: faStar,
  fire: faFire,
  caret: faCaretRight,
  party: faChampagneGlasses,
  circle: faCircle,
};

// Source ID to icon mapping
export const SOURCE_ICON_MAP: Record<string, string> = {
  "beergirl-calendar": "beer",
  "alwayslovebeer-calendar": "calendar",
  "walkerplus-liquor-kanto": "wine",
  "beerfestival-info": "tent",
};

interface IconProps {
  name: string;
  className?: string;
  "aria-hidden"?: boolean;
}

export function Icon({ name, className, "aria-hidden": ariaHidden = true }: IconProps) {
  const icon = iconMap[name];
  if (!icon) {
    return null;
  }
  return <FontAwesomeIcon icon={icon} className={className} aria-hidden={ariaHidden} />;
}

// Source icon component
interface SourceIconProps {
  sourceId: string;
  className?: string;
}

export function SourceIcon({ sourceId, className }: SourceIconProps) {
  const iconName = SOURCE_ICON_MAP[sourceId] || "calendar";
  return <Icon name={iconName} className={className} />;
}
