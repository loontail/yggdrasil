import { Box, Button, Flex, Modal, Typography } from '@strapi/design-system';
import { Trash } from '@strapi/icons';
import { useState } from 'react';
import SkinViewer3D from '../../components/SkinViewer3D';
import { useTranslate } from '../../hooks/useTranslate';
import type { PlayerCape, PlayerSkin } from '../../types/entities';
import { formatBytes } from '../../utils/formatBytes';

type Entry = PlayerSkin | PlayerCape;
type EntryType = 'skin' | 'cape';

interface Props {
  entry: Entry;
  type: EntryType;
  serverUrl: string;
  onDeleted: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
  onClose: () => void;
}

interface FieldProps {
  label: string;
  value: string;
}

const Field = ({ label, value }: FieldProps) => (
  <Box paddingBottom={4}>
    <Typography
      variant="sigma"
      textColor="neutral500"
      style={{
        display: 'block',
        marginBottom: 4,
        textTransform: 'uppercase',
        fontSize: 11,
        letterSpacing: '0.08em',
      }}
    >
      {label}
    </Typography>
    <Typography variant="omega">{value}</Typography>
  </Box>
);

const SkinDetailModal = ({ entry, type, serverUrl, onDeleted, onDelete, onClose }: Props) => {
  const translate = useTranslate();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fileUrl = entry.fileUrl.startsWith('http') ? entry.fileUrl : `${serverUrl}${entry.fileUrl}`;

  const skinUrl = type === 'skin' ? fileUrl : undefined;
  const capeUrl = type === 'cape' ? fileUrl : undefined;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(entry.id);
      onDeleted(entry.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const title = entry.username ?? translate('card.userFallback', { userId: entry.userId });
  const typeLabel = type === 'skin' ? translate('type.skin') : translate('type.cape');

  return (
    <Modal.Root
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Modal.Content>
        <Modal.Header>
          <Typography variant="beta">{title}</Typography>
        </Modal.Header>

        <Modal.Body>
          <Flex gap={8} alignItems="flex-start">
            <Box
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <SkinViewer3D skinUrl={skinUrl} capeUrl={capeUrl} width={200} height={320} />
            </Box>

            <Box style={{ flex: 1, paddingTop: 8 }}>
              <Field label={translate('field.username')} value={entry.username ?? '—'} />
              <Field label={translate('field.userId')} value={String(entry.userId)} />
              <Field label={translate('field.type')} value={typeLabel} />
              <Field label={translate('field.fileSize')} value={formatBytes(entry.fileSize)} />
              <Field label={translate('field.fileUrl')} value={entry.fileUrl} />
            </Box>
          </Flex>
        </Modal.Body>

        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary" onClick={onClose}>
              {translate('button.close')}
            </Button>
          </Modal.Close>

          {confirmDelete ? (
            <Flex gap={2}>
              <Button variant="tertiary" onClick={() => setConfirmDelete(false)}>
                {translate('button.cancel')}
              </Button>
              <Button
                variant="danger"
                startIcon={<Trash />}
                onClick={handleDelete}
                loading={deleting}
              >
                {translate('button.confirmDelete')}
              </Button>
            </Flex>
          ) : (
            <Button
              variant="danger-light"
              startIcon={<Trash />}
              onClick={() => setConfirmDelete(true)}
            >
              {translate('button.delete')}
            </Button>
          )}
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default SkinDetailModal;
