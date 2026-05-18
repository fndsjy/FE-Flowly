import type { ImgHTMLAttributes } from "react";
import AppImage from "./AppImage";

type DomasLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  alt?: string;
};

const DomasLogo = ({ alt = "Logo Domas", width = 80, ...props }: DomasLogoProps) => (
  <AppImage
    src="images/logo-domas.png"
    alt={alt}
    width={width}
    {...props}
  />
);

export default DomasLogo;
