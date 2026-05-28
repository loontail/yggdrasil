import { Box, EmptyStateLayout, Main } from '@strapi/design-system';
import { useTranslate } from '../../hooks/useTranslate';

/**
 * Placeholder under `/plugins/yggdrasil/sessions`. Lands here as the
 * navigation scaffold for upcoming session analytics — active sessions,
 * recent join events, per-server activity, etc. Keep the route stable
 * so future iterations don't reshuffle URLs.
 *
 * `EmptyStateLayout.content` accepts a plain string only; the previous
 * version that nested JSX (title + description) compiled under loose
 * typing but no longer does. Collapse to title-as-content.
 */
const SessionsPage = () => {
  const translate = useTranslate();
  return (
    <Main>
      <Box padding={10}>
        <EmptyStateLayout icon={<Box />} content={translate('sessions.empty.title')} />
      </Box>
    </Main>
  );
};

export default SessionsPage;
