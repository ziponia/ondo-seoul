# 화면 체크리스트

시안 캔버스: https://claude.ai/artifact/7QvYVXtXfW1LBkUf82BQ5e (ONDO SEOUL · sayren storefront-sdk 쇼케이스)

- 데스크톱 시안과 모바일 시안은 **같은 라우트를 반응형으로** 구현한다. 모바일 시안 이름은 `M*`이다.
- 상태 시안(빈 장바구니, 품절, 결과 없음 등)은 별도 라우트가 아니라 그 라우트의 상태다. 데모 시나리오로 확인한다(`docs/DEMO.md`).
- 완료 기준: 데스크톱(1440)·모바일(390) 스크린샷이 시안과 맞고, 데모 모드와 실제 상점에서 모두 열리며, 해당 테스트 시나리오(`docs/TEST-SCENARIOS.md`)를 통과한다.

상태: 미착수 · 진행 · 완료

## P0 기반

| 상태 | 항목                               | 시안     | 비고                                                     |
| ---- | ---------------------------------- | -------- | -------------------------------------------------------- |
| 완료 | 데모 모드(가짜 API, 시나리오 전환) | —        | `SAYREN_DEMO=1`, SDK `fetch` 주입                        |
| 완료 | 테마 토큰                          | 전체     | 흰 바탕·잉크 #111·포인트 #E0301E, Noto Sans KR + Archivo |
| 완료 | 헤더·GNB·푸터(사업자 정보)         | Main     | 푸터는 `sellerInfoOf(store)`                             |
| 완료 | 모바일 헤더·하단 탭                | Mobile   | 홈·카테고리·기획전·찜·마이                               |
| 완료 | 404                                | NotFound |                                                          |
| 완료 | 로딩 스켈레톤                      | Skeleton | 라우트 pending                                           |

## P1 탐색

| 상태 | 라우트                           | 시안                       | SDK                                                            |
| ---- | -------------------------------- | -------------------------- | -------------------------------------------------------------- |
| 완료 | `/` 홈                           | Main · Mobile              | listCollections, searchProducts(recommend·latest), listCoupons |
| 완료 | `/categories` 카테고리           | MCategory                  | listCategories                                                 |
| 완료 | `/c/$categoryId` 카테고리 목록   | List · MList               | searchProducts(categoryId·sort·price·freeShipping) + facets    |
| 완료 | `/search` 검색                   | Search · MSearch           | searchProducts(keyword) · 결과 없음 상태                       |
| 완료 | `/collections` 기획전 목록       | Collections · MCollections | listCollections                                                |
| 완료 | `/collections/$slug` 기획전 상세 | Collection · MCollection   | getCollection, listCollectionProducts                          |
| 완료 | `/coupons` 쿠폰존                | CouponZone · MCouponZone   | listCoupons(회원 토큰), me.downloadCoupon(받기·모두 받기)      |

## P2 상품

| 상태 | 라우트                            | 시안                                       | SDK                                                                         |
| ---- | --------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| 완료 | `/p/$productNo` 상품 상세         | Product · MProduct · SoldOut · CustomInput | getProduct, getCouponBenefit, getPointPolicy, cart.addItem, checkout.create |
| 완료 | `/p/$productNo/reviews` 리뷰 전체 | Reviews · MReviews                         | listProductReviews(hasImage·rating·variantId·sort)                          |
| 완료 | `/p/$productNo/qna` 상품 문의     | ProductQna · MProductQna                   | listProductInquiries, createInquiry                                         |

## P3 구매

| 상태 | 라우트                                  | 시안                                                | SDK                                                                                                                       |
| ---- | --------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 완료 | `/cart` 장바구니                        | Cart · MCart · EmptyCart                            | cart.get/updateItem/removeItem, checkout.create                                                                           |
| 완료 | `/checkout/$checkoutId` 주문서          | Checkout · MCheckout · Pickup                       | checkout.get/pricing/applicableCoupons/bestCoupons/startPayment, member.listAddresses/createAddress, pickupLocations.list |
| 완료 | `/checkout/return` 결제 복귀            | PayProcessing · MPayProcessing · PayFail · MPayFail | payments.result/getStatus/retry                                                                                           |
| 완료 | `/checkout/complete/$orderId` 주문 완료 | OrderComplete · MOrderComplete                      | myOrders.get                                                                                                              |

## P4 회원

| 상태 | 라우트                                      | 시안             | SDK                      |
| ---- | ------------------------------------------- | ---------------- | ------------------------ |
| 완료 | `/login` 로그인                             | Login · MLogin   | auth.login, idpAuthorize |
| 완료 | `/auth/callback/$provider` 소셜 로그인 처리 | SocialCallback   | auth.idpToken            |
| 완료 | `/signup` 회원가입                          | Signup · MSignup | auth.signup              |

## P5 마이페이지

| 상태 | 라우트                                     | 시안                          | SDK                                                                                 |
| ---- | ------------------------------------------ | ----------------------------- | ----------------------------------------------------------------------------------- |
| 완료 | `/my` 마이페이지                           | MyPage · MMyPage              | member.me, getPoints, me.coupons, listWishlist, myOrders.list, reviews.listWritable |
| 완료 | `/my/coupons` 쿠폰 + 번호 등록             | MyPage(쿠폰) · CouponRegister | me.coupons, me.registerCoupon                                                       |
| 완료 | `/my/points` 적립금                        | MyPage(적립금)                | member.getPoints, listPointHistory                                                  |
| 완료 | `/my/wishlist` 찜                          | MWish · EmptyWish             | member.listWishlist/removeWishlist                                                  |
| 완료 | `/my/orders` 주문 내역                     | OrderHistory · MOrderHistory  | myOrders.list({ status, from })                                                     |
| 완료 | `/my/orders/$orderId` 주문 상세            | OrderDetail · MOrderDetail    | myOrders.get/getDelivery/decidePurchase, myClaims.preview/create                    |
| 완료 | `/my/claims` 취소·교환·반품                | Claims · MClaims              | myClaims.list/withdraw                                                              |
| 완료 | `/my/reviews` 내 리뷰                      | MyReviews · MMyReviews        | reviews.listWritable/listMine/remove                                                |
| 완료 | `/my/reviews/write/$orderItemId` 리뷰 작성 | ReviewWrite · MReviewWrite    | reviews.createImageUpload/create/update                                             |
| 완료 | `/my/inquiries` 상품 문의 목록             | MyInquiries · MMyInquiries    | inquiries.listMine                                                                  |
| 완료 | `/my/support` 1:1 문의                     | Support · MSupport            | me.customerInquiries.list/create                                                    |
| 완료 | `/my/support/$inquiryId` 1:1 문의 상세     | SupportDetail                 | me.customerInquiries.get                                                            |
| 완료 | `/my/account` 회원 정보                    | Account · MAccount            | updateMe, 배송지, updateConsents, identities, withdraw                              |

## P6 해외

| 상태 | 항목                            | 시안                             | SDK                                 |
| ---- | ------------------------------- | -------------------------------- | ----------------------------------- |
| 완료 | 국가·통화 선택                  | GlobalProduct · MGlobalProduct   | store.get(markets·market)           |
| 완료 | 해외 주문서(해외 배송지·PayPal) | GlobalCheckout · MGlobalCheckout | 국제 배송지 입력, EASY_PAY + PAYPAL |

## 시안에 넣지 않은 것

- 홈 「포토 리뷰」: 상점 전체 리뷰를 한 번에 읽는 API가 없다(상품별 `listProductReviews`만 있음). 홈에서 뺐다.

- 가상계좌: live 미지원(avarcorp/sayren#387). 지원 뒤 주문서·입금 대기 화면을 더한다.
- 비회원 주문: 회원 전용으로 정했다.
