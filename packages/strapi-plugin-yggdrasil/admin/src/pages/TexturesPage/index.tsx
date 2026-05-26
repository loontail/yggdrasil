import { Box, Button, Flex, Main, Typography } from '@strapi/design-system';
import { ArrowClockwise, Plus, Trash } from '@strapi/icons';
import { useNotification } from '@strapi/strapi/admin';
import { useCallback, useState } from 'react';
import { useTheme } from 'styled-components';
import { texturesApi } from '../../api/texturesApi';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useTranslate } from '../../hooks/useTranslate';
import type { PlayerCape, PlayerSkin } from '../../types/entities';
import AssetTab from './AssetTab';
import UploadModal from './UploadModal';

const PAGE_SIZE = 100;
const H_PAD = '56px';

const getServerUrl = (): string => {
  try {
    const config = (window as unknown as { strapi?: { backendURL?: string } }).strapi;
    return config?.backendURL ?? window.location.origin;
  } catch {
    return window.location.origin;
  }
};

const TexturesPage = () => {
  const translate = useTranslate();
  const theme = useTheme();
  const { toggleNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'skins' | 'capes'>('skins');
  const [showUpload, setShowUpload] = useState(false);
  const [missingIds, setMissingIds] = useState<{
    skins: Set<number>;
    capes: Set<number>;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [purging, setPurging] = useState(false);
  const serverUrl = getServerUrl();

  const fetchSkins = useCallback(
    (search: string, page: number) => texturesApi.listSkins({ page, pageSize: PAGE_SIZE, search }),
    [],
  );
  const fetchCapes = useCallback(
    (search: string, page: number) => texturesApi.listCapes({ page, pageSize: PAGE_SIZE, search }),
    [],
  );

  const [skinsState, skinsActions] = usePaginatedList<PlayerSkin>(fetchSkins, PAGE_SIZE);
  const [capesState, capesActions] = usePaginatedList<PlayerCape>(fetchCapes, PAGE_SIZE);

  const handleValidate = useCallback(async () => {
    setValidating(true);
    try {
      const result = await texturesApi.validate();
      const ids = { skins: new Set(result.missingSkins), capes: new Set(result.missingCapes) };
      setMissingIds(ids);
      const total = result.missingSkins.length + result.missingCapes.length;
      toggleNotification({
        type: total > 0 ? 'warning' : 'success',
        message:
          total > 0
            ? translate('validate.toast.missing', { count: total })
            : translate('validate.toast.ok'),
      });
    } catch {
      toggleNotification({ type: 'warning', message: 'Validation failed' });
    } finally {
      setValidating(false);
    }
  }, [toggleNotification, translate]);

  const handlePurgeMissing = useCallback(async () => {
    setPurging(true);
    try {
      const result = await texturesApi.purgeMissing();
      setMissingIds(null);
      skinsActions.refresh();
      capesActions.refresh();
      toggleNotification({
        type: 'success',
        message: translate('purge.toast.success', {
          deletedSkins: result.deletedSkins,
          deletedCapes: result.deletedCapes,
        }),
      });
    } catch {
      toggleNotification({ type: 'warning', message: 'Purge failed' });
    } finally {
      setPurging(false);
    }
  }, [toggleNotification, translate, skinsActions, capesActions]);

  const handleSkinDeleted = useCallback(() => {
    skinsActions.refresh();
  }, [skinsActions]);
  const handleCapeDeleted = useCallback(() => {
    capesActions.refresh();
  }, [capesActions]);
  const handleSkinUploaded = useCallback(() => {
    skinsActions.refresh();
  }, [skinsActions]);
  const handleCapeUploaded = useCallback(() => {
    capesActions.refresh();
  }, [capesActions]);

  return (
    <Main>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <Box style={{ padding: `40px ${H_PAD} 32px` }}>
        <Flex justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="alpha">{translate('textures.page.title')}</Typography>
            <Box paddingTop={1}>
              <Typography variant="epsilon" textColor="neutral500">
                {translate('textures.page.subtitle', {
                  skinsTotal: skinsState.total,
                  capesTotal: capesState.total,
                })}
              </Typography>
            </Box>
          </Box>
          <Flex gap={2} style={{ paddingTop: 4 }}>
            {missingIds && missingIds.skins.size + missingIds.capes.size > 0 && (
              <Button
                startIcon={<Trash />}
                variant="danger"
                loading={purging}
                onClick={handlePurgeMissing}
              >
                {translate('button.deleteMissing', {
                  count: missingIds.skins.size + missingIds.capes.size,
                })}
              </Button>
            )}
            <Button
              startIcon={<ArrowClockwise />}
              variant="secondary"
              loading={validating}
              onClick={handleValidate}
            >
              {translate('button.validate')}
            </Button>
            <Button
              startIcon={<ArrowClockwise />}
              variant="secondary"
              onClick={() => {
                setMissingIds(null);
                skinsActions.refresh();
                capesActions.refresh();
              }}
            >
              {translate('button.refresh')}
            </Button>
            <Button startIcon={<Plus />} onClick={() => setShowUpload(true)}>
              {translate('button.upload')}
            </Button>
          </Flex>
        </Flex>
      </Box>

      {/* ── Tab bar ────────────────────────────────────────────────── */}
      <Box style={{ padding: `0 ${H_PAD}` }}>
        <Flex gap={1} alignItems="flex-start">
          {(['skins', 'capes'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 20px',
                  border: `1px solid ${
                    isActive ? theme.colors.primary600 : theme.colors.neutral200
                  }`,
                  borderRadius: 6,
                  background: isActive ? theme.colors.primary100 : 'transparent',
                  color: isActive ? theme.colors.primary700 : theme.colors.neutral500,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'color 0.15s, border-color 0.15s, background 0.15s',
                }}
              >
                {tab === 'skins' ? translate('tab.skins') : translate('tab.capes')}
              </button>
            );
          })}
        </Flex>
      </Box>

      {/* ── Tab content ────────────────────────────────────────────── */}
      {activeTab === 'skins' && (
        <AssetTab
          kind="skin"
          items={skinsState.items}
          total={skinsState.total}
          page={skinsState.page}
          pageCount={skinsState.pageCount}
          loading={skinsState.loading}
          search={skinsState.search}
          serverUrl={serverUrl}
          missingIds={missingIds?.skins}
          onSearchChange={skinsActions.setSearch}
          onSearchClear={skinsActions.clearSearch}
          onSearchSubmit={skinsActions.submitSearch}
          onPageChange={skinsActions.changePage}
          onDeleted={handleSkinDeleted}
          onDelete={(id) => texturesApi.deleteSkin(id).then(() => {})}
        />
      )}

      {activeTab === 'capes' && (
        <AssetTab
          kind="cape"
          items={capesState.items}
          total={capesState.total}
          page={capesState.page}
          pageCount={capesState.pageCount}
          loading={capesState.loading}
          search={capesState.search}
          serverUrl={serverUrl}
          missingIds={missingIds?.capes}
          onSearchChange={capesActions.setSearch}
          onSearchClear={capesActions.clearSearch}
          onSearchSubmit={capesActions.submitSearch}
          onPageChange={capesActions.changePage}
          onDeleted={handleCapeDeleted}
          onDelete={(id) => texturesApi.deleteCape(id).then(() => {})}
        />
      )}

      {showUpload && (
        <UploadModal
          onSkinUploaded={handleSkinUploaded}
          onCapeUploaded={handleCapeUploaded}
          onClose={() => setShowUpload(false)}
        />
      )}
    </Main>
  );
};

export default TexturesPage;
