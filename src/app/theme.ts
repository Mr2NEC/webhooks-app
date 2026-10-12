import { Badge, createTheme, Modal, Paper, Select, Table, type MantineColorsTuple } from '@mantine/core';
import classes from './theme.module.css';

const iris: MantineColorsTuple = [
  '#EEF0FF',
  '#DADDFF',
  '#B9BEFF',
  '#9AA1FF',
  '#838BFF',
  '#6F77F5',
  '#5F66E6',
  '#4E54C9',
  '#4146A6',
  '#353A85',
];

const ink: MantineColorsTuple = [
  '#E3E7F4',
  '#BEC4DC',
  '#99A1C0',
  '#727B9E',
  '#3A4366',
  '#2C3454',
  '#232A45',
  '#1A2036',
  '#121627',
  '#0C0F1C',
];

const SANS = "'Segoe UI Variable Text', 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const DISPLAY = `'Segoe UI Variable Display', ${SANS}`;

export const theme = createTheme({
  colors: { iris, dark: ink },
  primaryColor: 'iris',
  primaryShade: 6,
  defaultRadius: 'md',
  radius: { lg: '0.75rem' },
  fontFamily: SANS,
  fontFamilyMonospace: "'Cascadia Code', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  headings: { fontFamily: DISPLAY, fontWeight: '600' },
  components: {
    Paper: Paper.extend({ defaultProps: { radius: 'lg' } }),
    Select: Select.extend({
      defaultProps: { withCheckIcon: false },
      classNames: { option: classes.selectOption },
    }),
    Modal: Modal.extend({
      defaultProps: { radius: 'lg' },
      styles: { title: { fontFamily: DISPLAY, fontSize: 'var(--mantine-font-size-xl)', fontWeight: 600 } },
    }),
    Badge: Badge.extend({ styles: { root: { textTransform: 'none' }, label: { fontWeight: 500 } } }),
    Table: Table.extend({
      defaultProps: { horizontalSpacing: 'lg', verticalSpacing: 'sm' },
      styles: { th: { color: 'var(--mantine-color-dimmed)', fontWeight: 500 } },
    }),
  },
});
