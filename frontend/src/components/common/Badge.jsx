import React from 'react';
import { statusColor, capitalize } from '../../utils/formatters';

const Badge = ({ value, custom }) => (
  <span className={custom || statusColor(value)}>{capitalize(value)}</span>
);

export default Badge;
