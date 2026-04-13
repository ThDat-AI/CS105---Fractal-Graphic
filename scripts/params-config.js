// scripts/params-config.js
// Cấu hình tham số cho từng loại fractal

const FRACTAL_PARAMS = {
  koch: {
    label: 'Koch Snowflake — Bông Tuyết Koch',
    info: 'Bông tuyết Koch là fractal tạo bằng cách thay thế đoạn giữa của mỗi cạnh tam giác bằng hai cạnh nhọn. Mỗi cấp độ tăng số cạnh lên 4 lần.',
    params: [
      {
        id: 'koch_levels',
        name: 'Levels (Cấp độ đệ quy)',
        type: 'range', min: 0, max: 7, step: 1, default: 4,
        hint: 'Số lần lặp. Level 7 có thể chậm hơn.'
      },
      {
        id: 'koch_color_inner',
        name: 'Inner Color',
        type: 'color', default: '#0077cc'
      },
      {
        id: 'koch_bg',
        name: 'Background Color',
        type: 'color', default: '#f8fbff'
      }
    ]
  },

  minkowski: {
    label: 'Minkowski Island — Đảo Minkowski',
    info: 'Đảo Minkowski là một fractal được tạo bằng cách áp dụng đường cong Minkowski (thay thế mỗi đoạn thẳng bằng 8 đoạn nhỏ hơn, tạo thành các hình vuông lồi ra ngoài) lên các cạnh của một hình vuông.',
    params: [
      {
        id: 'mink_levels',
        name: 'Levels (Cấp độ đệ quy)',
        type: 'range', min: 0, max: 7, step: 1, default: 3,
        hint: 'Số lần lặp. Level 7 có thể chậm hơn.'
      },
      {
        id: 'mink_color',
        name: 'Line Color',
        type: 'color', default: '#0077cc'
      },
      {
        id: 'mink_bg',
        name: 'Background Color',
        type: 'color', default: '#f8fbff'
      }
    ]
  },

  sierpinski_triangle: {
    label: 'Sierpiński Triangle — Tam Giác Sierpiński',
    info: 'Tam giác Sierpiński. Tạo bằng cách chia đệ quy một tam giác thành 4 tam giác nhỏ và loại bỏ tam giác ở giữa.',
    params: [
      {
        id: 'sier_t_levels',
        name: 'Levels (Cấp độ đệ quy)',
        type: 'range', min: 0, max: 7, step: 1, default: 6
      },
      {
        id: 'sier_t_color',
        name: 'Triangle Color',
        type: 'color', default: '#0077cc'
      },
      {
        id: 'sier_t_bg',
        name: 'Background Color',
        type: 'color', default: '#f8fbff'
      }
    ]
  },

  sierpinski_carpet: {
    label: 'Sierpiński Carpet — Hình Vuông Sierpiński',
    info: 'Thảm Sierpiński. Mỗi hình vuông được chia thành 9 ô vuông nhỏ và ô giữa bị xóa đi, lặp lại đệ quy.',
    params: [
      {
        id: 'sier_c_levels',
        name: 'Levels (Cấp độ đệ quy)',
        type: 'range', min: 0, max: 7, step: 1, default: 4
      },
      {
        id: 'sier_c_color',
        name: 'Fill Color',
        type: 'color', default: '#0077cc'
      },
      {
        id: 'sier_c_bg',
        name: 'Background Color',
        type: 'color', default: '#f8fbff'

      }
    ]
  },

  mandelbrot: {
    label: 'Mandelbrot Set',
    info: 'Mandelbrot Set. Tập hợp các điểm c trong mặt phẳng phức sao cho hàm f(z) = z² + c không phân kỳ khi lặp từ z=0.',
    params: [
      {
        id: 'mandel_iter',
        name: 'Max Iterations',
        type: 'range', min: 50, max: 1000, step: 50, default: 200
      },
      {
        id: 'mandel_cx',
        name: 'Center X',
        type: 'range', min: -2.5, max: 1.0, step: 0.01, default: -0.5
      },
      {
        id: 'mandel_cy',
        name: 'Center Y',
        type: 'range', min: -1.5, max: 1.5, step: 0.01, default: 0.0
      },
      {
        id: 'mandel_bg',
        name: 'Background Color',
        type: 'color', default: '#060713'
      },
      {
        id: 'mandel_color',
        name: 'Image Color 1',
        type: 'color', default: '#00d4ff'
      },
      {
        id: 'mandel_color2',
        name: 'Image Color 2',
        type: 'color', default: '#ff7b72'
      }
    ]
  },

  julia: {
    label: 'Julia Set',
    info: 'Julia Set. Giống Mandelbrot nhưng c là hằng số cố định, còn z là điểm đang xét. Thay đổi C_Real và C_Imag sẽ tạo ra các hình dạng Julia khác nhau.',
    params: [
      {
        id: 'julia_iter',
        name: 'Max Iterations',
        type: 'range', min: 50, max: 1000, step: 50, default: 200
      },
      {
        id: 'julia_cr',
        name: 'C Real (hằng số thực)',
        type: 'range', min: -2.0, max: 2.0, step: 0.01, default: -0.7
      },
      {
        id: 'julia_ci',
        name: 'C Imaginary (hằng số ảo)',
        type: 'range', min: -2.0, max: 2.0, step: 0.01, default: 0.27
      },
      {
        id: 'julia_bg',
        name: 'Background Color',
        type: 'color', default: '#05060f'
      },
      {
        id: 'julia_color',
        name: 'Image Color 1',
        type: 'color', default: '#de5cff'
      },
      {
        id: 'julia_color2',
        name: 'Image Color 2',
        type: 'color', default: '#24d4ff'
      }
    ]
  }
};
