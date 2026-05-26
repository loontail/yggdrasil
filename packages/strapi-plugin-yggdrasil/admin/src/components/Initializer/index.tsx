import { useEffect, useRef } from 'react';
import pluginId from '../../pluginId';

interface Props {
  setPlugin: (id: string) => void;
}

const Initializer = ({ setPlugin }: Props) => {
  const ref = useRef(setPlugin);
  ref.current = setPlugin;

  useEffect(() => {
    ref.current(pluginId);
  }, []);

  return null;
};

export default Initializer;
