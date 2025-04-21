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
