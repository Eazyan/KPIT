/// <reference types="react-scripts" />

declare module 'sweetalert2' {
  const swal: any;
  export default swal;
}

declare module 'react-icons/fa' {
  import { IconType } from 'react-icons';
  export const FaTrash: IconType;
  export const FaEye: IconType;
  export const FaBug: IconType;
}

// Добавляем декларацию типа для Buffer в глобальном объекте window
interface Window {
    Buffer: typeof Buffer;
}
