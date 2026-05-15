import type { ImgHTMLAttributes } from "react";

type DomasLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  alt?: string;
};

const DomasLogo = ({ alt = "Logo Domas", width = 80, ...props }: DomasLogoProps) => (
  <img
    src="/images/logo-domas.png"
    // src={`${import.meta.env.BASE_URL}images/logo-domas.png`}
    alt={alt}
    width={width}
    {...props}
  />
);

export default DomasLogo;
