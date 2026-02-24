import { useNavigate } from "react-router-dom";

type BackButtonProps = {
  to?: string;
  className?: string;
};

const BackButton = ({ to, className }: BackButtonProps) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (to) {
      navigate(to);
      return;
    }
    navigate(-1);
  };

  return (
    <button
      onClick={handleClick}
      className={
        className ??
        "flex items-center justify-center w-10 h-10 rounded-full text-[#272e79] shadow-lg shadow-gray-400 hover:bg-gray-100"
      }
    >
      <i className="fa-solid fa-arrow-left"></i>
    </button>
  );
};

export default BackButton;
