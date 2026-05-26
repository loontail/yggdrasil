import { Box, Typography } from '@strapi/design-system';
import { memo, useState } from 'react';
import { useTheme } from 'styled-components';
import SkinPreview2D from '../../components/SkinPreview2D';
import { useTranslate } from '../../hooks/useTranslate';
import type { PlayerCape, PlayerSkin } from '../../types/entities';
import { formatBytes } from '../../utils/formatBytes';
import SkinDetailModal from './SkinDetailModal';

type Entry = PlayerSkin | PlayerCape;
type EntryType = 'skin' | 'cape';

interface Props {
  entry: Entry;
  type: EntryType;
  serverUrl: string;
  isMissing?: boolean;
  onDeleted: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
}

const SkinCard = memo(function SkinCard({
  entry,
  type,
  serverUrl,
  isMissing,
  onDeleted,
  onDelete,
}: Props) {
  const translate = useTranslate();
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const fileUrl = entry.fileUrl.startsWith('http') ? entry.fileUrl : `${serverUrl}${entry.fileUrl}`;

  const skinUrl = type === 'skin' ? fileUrl : undefined;
  const capeUrl = type === 'cape' ? fileUrl : undefined;

  const displayName = entry.username ?? translate('card.userFallback', { userId: entry.userId });
  const dangerColor = theme.colors.danger600;
  const dangerHoverColor = theme.colors.danger500;
  const primaryColor = theme.colors.primary600;
  const onDangerColor = theme.colors.neutral0;

  return (
    <>
      <Box
        background="neutral0"
        borderColor={isMissing ? undefined : 'neutral150'}
        hasRadius
        padding={4}
        onClick={() => setOpen(true)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          position: 'relative',
          ...(isMissing && { border: `1px solid ${dangerColor}` }),
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={(event: React.MouseEvent<HTMLDivElement>) => {
          (event.currentTarget as HTMLDivElement).style.borderColor = isMissing
            ? dangerHoverColor
            : primaryColor;
        }}
        onMouseLeave={(event: React.MouseEvent<HTMLDivElement>) => {
          (event.currentTarget as HTMLDivElement).style.borderColor = isMissing ? dangerColor : '';
        }}
      >
        {isMissing && (
          <Box
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              background: dangerColor,
              color: onDangerColor,
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
              lineHeight: 1.4,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              zIndex: 1,
            }}
          >
            {translate('validate.badge')}
          </Box>
        )}
        <SkinPreview2D skinUrl={skinUrl} capeUrl={capeUrl} type={type} />
        <Box style={{ width: '100%' }}>
          <Typography variant="omega" fontWeight="semiBold">
            {displayName}
          </Typography>
          <Typography variant="pi" textColor="neutral500" style={{ display: 'block' }}>
            {translate('field.userId')}: {entry.userId}
          </Typography>
          <Typography variant="pi" textColor="neutral500" style={{ display: 'block' }}>
            {formatBytes(entry.fileSize)}
          </Typography>
        </Box>
      </Box>

      {open && (
        <SkinDetailModal
          entry={entry}
          type={type}
          serverUrl={serverUrl}
          onDeleted={(id) => {
            onDeleted(id);
            setOpen(false);
          }}
          onDelete={onDelete}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
});

export default SkinCard;
