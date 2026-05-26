import { useEffect, useRef } from 'react';
import defaultSkinAsset from '../../assets/default-skin.png';

interface Props {
  skinUrl?: string;
  capeUrl?: string;
  width?: number;
  height?: number;
}

const SkinViewer3D = ({ skinUrl, capeUrl, width = 160, height = 240 }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<{
    dispose: () => void;
    loadSkin: (url: string) => void;
    loadCape: (url: string | null) => void;
  } | null>(null);

  const resolvedSkin = skinUrl ?? defaultSkinAsset;

  // Keep refs up-to-date so the async import callback always reads latest values
  const latestSkinRef = useRef(resolvedSkin);
  const latestCapeRef = useRef(capeUrl);
  latestSkinRef.current = resolvedSkin;
  latestCapeRef.current = capeUrl;

  // Creates (or recreates) the viewer. Re-runs only when canvas dimensions change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    import('skinview3d')
      .then(({ SkinViewer, WalkingAnimation }) => {
        if (cancelled || !canvas) return;

        const viewer = new SkinViewer({
          canvas,
          width,
          height,
          skin: latestSkinRef.current,
        });

        viewer.animation = new WalkingAnimation();
        viewer.autoRotate = true;
        viewer.autoRotateSpeed = 0.5;
        viewer.zoom = 0.9;

        if (latestCapeRef.current) viewer.loadCape(latestCapeRef.current);

        viewerRef.current = viewer as typeof viewerRef.current;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      viewerRef.current?.dispose();
      viewerRef.current = null;
    };
  }, [height, width]);

  useEffect(() => {
    if (!viewerRef.current) return;
    viewerRef.current.loadSkin(resolvedSkin);
  }, [resolvedSkin]);

  useEffect(() => {
    if (!viewerRef.current) return;
    viewerRef.current.loadCape(capeUrl ?? null);
  }, [capeUrl]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', borderRadius: 8 }}
    />
  );
};

export default SkinViewer3D;
