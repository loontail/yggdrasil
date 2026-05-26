import { Box, EmptyStateLayout, Main, Typography } from '@strapi/design-system';
import { useTranslate } from '../../hooks/useTranslate';

/**
 * Placeholder under `/plugins/yggdrasil/sessions`. Lands here as the
 * navigation scaffold for upcoming session analytics — active sessions,
 * recent join events, per-server activity, etc. Keep the route stable
 * so future iterations don't reshuffle URLs.
 */
const SessionsPage = () => {
  const translate = useTranslate();
  return (
    <Main>
      <Box padding={10}>
        <EmptyStateLayout
          icon={<Box />}
          content={
            <Box>
              <Typography variant="beta" style={{ display: 'block', textAlign: 'center' }}>
                {translate('sessions.empty.title')}
              </Typography>
              <Box paddingTop={2}>
                <Typography variant="epsilon" textColor="neutral500">
                  {translate('sessions.empty.description')}
                </Typography>
              </Box>
            </Box>
          }
        />
      </Box>
    </Main>
  );
};

export default SessionsPage;
