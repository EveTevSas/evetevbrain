import Image from "next/image";
import isotipoAzulNoche from "../../../packages/brand/assets/isotipos/isotipo-azul-noche.svg";
import isotipoBlanco from "../../../packages/brand/assets/isotipos/isotipo-blanco.svg";

export function BrandMark({
  inverse = false,
  size = 34,
  priority = false
}: {
  inverse?: boolean;
  size?: number;
  priority?: boolean;
}) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      height={Math.round(size * 0.7)}
      priority={priority}
      src={inverse ? isotipoBlanco : isotipoAzulNoche}
      width={size}
    />
  );
}
