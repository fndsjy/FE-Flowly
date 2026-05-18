import {
  forwardRef,
  useEffect,
  useMemo,
  useState,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from "react";
import {
  getPublicAssetCandidates,
  rememberPublicAssetUrl,
} from "../../lib/assets";

type AppImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
};

const AppImage = forwardRef<HTMLImageElement, AppImageProps>(function AppImage(
  { src, onError, onLoad, ...props },
  ref
) {
  const candidates = useMemo(() => getPublicAssetCandidates(src), [src]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [src]);

  const resolvedSrc = candidates[candidateIndex] ?? src;

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    if (candidateIndex < candidates.length - 1) {
      setCandidateIndex((current) =>
        Math.min(current + 1, candidates.length - 1)
      );
      return;
    }

    onError?.(event);
  };

  const handleLoad = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    rememberPublicAssetUrl(resolvedSrc);
    onLoad?.(event);
  };

  return (
    <img
      {...props}
      ref={ref}
      src={resolvedSrc}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
});

export default AppImage;
