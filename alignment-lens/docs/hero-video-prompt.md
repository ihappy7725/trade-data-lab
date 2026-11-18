# PARALLEL · 컨테이너선 배경 루핑 영상 제작 프롬프트

직접 영상 생성은 수행하지 않았다. 유료 플랜·유료 생성은 사용하지 않는다. 현재 홈페이지는 출처가 있는 사진을 가로 구도로 표시하며, 이를 제작 영상이라고 부르지 않는다.

## 복사할 영어 프롬프트

Create an original photorealistic aerial ocean shot for a full-screen website background. A long, unbranded container ship is aligned perfectly horizontally, stern on the left and bow pointing to the right, sailing steadily across deep turquoise-blue water. A locked, directly overhead tracking camera travels alongside the vessel, keeping its horizontal position and scale stable while the textured ocean flows smoothly from right to left. The ship fills the middle third of the image vertically and extends across most of the frame horizontally. Show realistic containers, a restrained natural white wake, crisp daylight and subtle moving sun reflections. Leave open water in the upper part of the frame for navigation and in the lower-left area for a large website title. Keep the movement calm and continuous.

Make this a seamless loop: match the exact ship position, camera scale, lighting, wake shape and wave phase at the first and last frames. One continuous shot, fixed orientation, constant speed, no camera rotation, no zoom, no cuts, no fades, no reverse motion. No text, no logos, no flags, no watermark, no interface elements, no additional vessels. Silent. Landscape 16:9, 1920×1080, 24 or 30 fps, approximately 10 seconds.

## 루프 검수와 내보내기

- 프롬프트만으로 이음새가 보장되지는 않는다. 완성 클립을 3회 이어 재생해 선체·물결·항적이 튀는지 확인한다.
- 선체를 겹쳐 크로스페이드하면 배가 두 겹으로 보일 수 있다. 시작·끝의 구도가 일치하는 구간을 잘라 연결한다. 필요하면 배는 고정한 채 바다·항적 층을 별도로 루프 편집한다.
- MP4, H.264, 오디오 트랙 없음, 웹 재생용 fast-start로 내보낸다. 비트레이트는 화면 품질을 보고 조절한다.
- 이 영상은 서비스 설명용 장면이다. 실제 관측한 국가 쌍이나 해당 연도의 교역 현장으로 표시하지 않는다.

## 사이트에 연결하기

서비스 폴더 안에 `assets/video/container-crossing.mp4`로 저장하고, `index.html`의 `id="hero-video"` 요소에서 빈 `data-src=""`를 `data-src="assets/video/container-crossing.mp4"`로 바꾼다.

기존 코드가 `muted`, `loop`, `playsinline` 재생과 모션 버튼·동작 줄이기를 처리한다. 영상이 로드되기 전이나 재생 파일 오류 시 사진을 유지한다. 현재 `data-src`는 비어 있으므로 없는 파일을 요청하지 않는다.
