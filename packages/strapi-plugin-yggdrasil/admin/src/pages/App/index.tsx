import { Box, Flex } from '@strapi/design-system';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTheme } from 'styled-components';
import { useTranslate } from '../../hooks/useTranslate';
import SessionsPage from '../SessionsPage';
import TexturesPage from '../TexturesPage';

interface SectionLink {
  readonly to: string;
  readonly label: string;
}

const SECTIONS: readonly SectionLink[] = [
  { to: 'textures', label: 'nav.textures' },
  { to: 'sessions', label: 'nav.sessions' },
];

const SectionNav = () => {
  const translate = useTranslate();
  const theme = useTheme();
  const location = useLocation();

  return (
    <Box
      style={{
        borderBottom: `1px solid ${theme.colors.neutral150}`,
        background: theme.colors.neutral0,
      }}
    >
      <Flex gap={1} style={{ padding: '12px 56px 0' }}>
        {SECTIONS.map((section) => {
          const isActive = location.pathname.endsWith(`/${section.to}`);
          return (
            <Link
              key={section.to}
              to={section.to}
              style={{
                padding: '10px 18px',
                borderBottom: `2px solid ${isActive ? theme.colors.primary600 : 'transparent'}`,
                color: isActive ? theme.colors.primary700 : theme.colors.neutral600,
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {translate(section.label)}
            </Link>
          );
        })}
      </Flex>
    </Box>
  );
};

const App = () => (
  <>
    <SectionNav />
    <Routes>
      <Route index element={<Navigate to="textures" replace />} />
      <Route path="textures" element={<TexturesPage />} />
      <Route path="sessions" element={<SessionsPage />} />
      <Route path="*" element={<Navigate to="textures" replace />} />
    </Routes>
  </>
);

export default App;
