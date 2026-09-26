import { avatarHue, getInitials } from "../utils/userDisplay";

export default function UserAvatar({
  user,
  size = "md",
  className = "",
  title,
}) {
  const name = user?.full_name;
  const src = user?.avatar_base64;
  const hue = avatarHue(name);
  const initials = getInitials(name);
  const gradient = `linear-gradient(135deg, hsl(${hue} 68% 52%), hsl(${(hue + 40) % 360} 72% 58%))`;

  if (src) {
    return (
      <img
        src={src}
        alt={title || name || "Avatar"}
        className={`user-avatar-img user-avatar-${size} ${className}`}
        title={title}
      />
    );
  }

  return (
    <span
      className={`avatar avatar-gradient user-avatar-${size} ${className}`}
      style={{ background: gradient }}
      title={title}
      aria-hidden={!title}
    >
      {initials}
    </span>
  );
}
