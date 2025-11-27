import { useNavigate } from "react-router-dom";

const BackButton = () => {
    const navigate = useNavigate();

    return (
        <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-10 h-10 rounded-full text-[#272e79] shadow-lg shadow-gray-400 hover:bg-gray-100"
            >
              <i className="fa-solid fa-arrow-left"></i>
            </button>
    );
}

export default BackButton;