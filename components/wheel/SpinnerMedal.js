// The Wheel Spinner medal: shows the badge art (/badges/wheel-spinner-<tier>.png), with a drawn fallback.
import BadgeMedal from "../badges/BadgeMedal";

export default function SpinnerMedal({ tier = 0, size = 72 }) {
  return <BadgeMedal id="wheel-spinner" tier={tier} emoji="🎡" name="Wheel Spinner badge" size={size} />;
}
