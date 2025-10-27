<script module>
  declare const Swal: typeof SwalType;
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import type SwalType from "sweetalert2";
  import Portal from "svelte-portal";
  import copyExample from "./lib/example.png";

  const 샘플데이터json = `[{"uuid":"175e0a7c-ec8a-4cc0-9e77-80af8ef2c281","collapsed":false,"productInfo":{"itemType":0,"useprop":false,"sell_price":0,"dome_price":0,"qty":0,"margin":0,"total_dome":0,"soldout":false},"deliveryInfo":{}},{"uuid":"51094377-b4bc-48c6-af7c-f93e9531bac3","collapsed":false,"productInfo":{"itemType":0,"useprop":false,"sell_price":0,"dome_price":0,"qty":0,"margin":0,"total_dome":0,"soldout":false},"deliveryInfo":{}},{"uuid":"95ae3f65-0135-4d40-b298-57538d9d7385","collapsed":false,"productInfo":{"itemType":0,"useprop":false,"sell_price":0,"dome_price":0,"qty":0,"margin":0,"total_dome":0,"soldout":false},"deliveryInfo":{}}]`;
  const 샘플데이터 = $state(JSON.parse(샘플데이터json));
  $inspect(샘플데이터);

  type 배송형태종류타입 = (typeof 배송형태종류)[number];

  type 품목리스트항목타입 = {
    uuid: string;
    productInfo: 제품정보타입;
    deliveryInfo: 배송정보타입;
    collapsed: boolean;
    editable?: boolean;
    finished?: boolean;
  };

  type 제품정보타입 = {
    itemType: 0 | 1 | 2;
    brand: string | undefined;
    product: string | undefined;
    PROD_CD: string | undefined;
    prop: string | undefined;
    useprop: boolean;
    sell_price: number | undefined;
    dome_price: number | undefined;
    qty: number | undefined;
    margin: number | undefined;
    total_dome: number | undefined;
    soldout: boolean;
  };

  type 배송정보타입 = {
    name: string | undefined;
    hp1: string | undefined;
    hp2: string | undefined;
    addr1: string | undefined;
    addr2: string | undefined;
    addr3: string | undefined;
    postcode: string | undefined;
    msg: string | undefined;
  };

  let 발주서상태: string = $state("대기");
  let 컨테이너 = $state();

  const 배송형태종류 = ["익일수령택배", "방문수령", "퀵착불", "퀵선불", "대리배송", "전자배송", ""] as const;
  let 배송형태: 배송형태종류타입 | undefined = $state();

  let 품목리스트: 품목리스트항목타입[] = $state(샘플데이터);

  let 어드민: boolean = $state(true);
  let 작성자: string | undefined = $state();
  let 발주제품군: string | undefined = $state();
  let 사업자변경: boolean = $state(false);
  let 사업자명: string | undefined = $state();
  let 사업자등록번호: string | undefined = $state();

  let 복사양식: string | undefined = $state();
  let 복사팝업열림: boolean = $state(false);

  async function 가격계산(e: Event, 품목: 품목리스트항목타입, 필드: string) {
    const 가능한필드 = ["소비자가", "공급단가", "수량", "마진"];
    if (!가능한필드.includes(필드)) return;

    const 요소 = e.currentTarget as HTMLInputElement;
    const 값 = 요소.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    요소.value = 값;
    const 숫자값 = Number(값) || 0;

    const 인덱스 = 품목리스트.findIndex(요소 => 요소.uuid == 품목.uuid);

    if (인덱스 == -1) return;

    function 계산_도매가(sell: number, margin: number) {
      return (sell * (100 - margin)) / 100;
    }

    function 계산_마진(sell: number, dome: number) {
      return 100 - (dome / sell) * 100;
    }

    switch (필드) {
      case "소비자가":
        품목리스트[인덱스].productInfo.sell_price = 숫자값;
        품목리스트[인덱스].productInfo.dome_price = 계산_도매가(숫자값, Number(품목리스트[인덱스].productInfo.margin));
        break;
      case "공급단가":
        품목리스트[인덱스].productInfo.dome_price = 숫자값;
        품목리스트[인덱스].productInfo.margin = 계산_마진(숫자값, Number(품목리스트[인덱스].productInfo.sell_price));
        break;
      case "마진":
        품목리스트[인덱스].productInfo.margin = 숫자값;
        품목리스트[인덱스].productInfo.dome_price = 계산_도매가(Number(품목리스트[인덱스].productInfo.sell_price), 숫자값);
        break;
      case "수량":
        요소.value = 요소.value.replace(/[^0-9]/g, "");
        품목리스트[인덱스].productInfo.qty = Math.floor(숫자값);
    }
    품목리스트[인덱스].productInfo.total_dome = Number(품목리스트[인덱스].productInfo.dome_price) * Number(품목리스트[인덱스].productInfo.qty);
  }

  // 배송정보 복사 버튼
  async function 배송정보복사(품목: 품목리스트항목타입 | 품목리스트항목타입[]) {
    if (Array.isArray(품목)) {
      복사양식 = 품목.reduce((acc, cur) => {
        return acc + "\n" + [cur.deliveryInfo.name, cur.deliveryInfo.postcode, [cur.deliveryInfo.addr1, cur.deliveryInfo.addr2, cur.deliveryInfo.addr3].join(" "), cur.deliveryInfo.hp1, cur.deliveryInfo.hp2, 작성자, cur.productInfo.product, cur.productInfo.qty, cur.deliveryInfo.msg].join("\t");
      }, "");
    } else {
      복사양식 = [품목.deliveryInfo.name, 품목.deliveryInfo.postcode, [품목.deliveryInfo.addr1, 품목.deliveryInfo.addr2, 품목.deliveryInfo.addr3].join(" "), 품목.deliveryInfo.hp1, 품목.deliveryInfo.hp2, 작성자, 품목.productInfo.product, 품목.productInfo.qty, 품목.deliveryInfo.msg].join("\t");
    }

    try {
      await navigator.clipboard.writeText(복사양식);
      Swal.fire({
        title: "클립보드에 복사되었습니다.",
        html: "",
        confirmButtonColor: "#e53935",
        icon: "success",
        confirmButtonText: "확인",
        timer: 10000,
        timerProgressBar: true,
        customClass: {
          htmlContainer: "copied",
        },
        willOpen: () => {
          복사팝업열림 = true;
        },
        didClose: () => {
          복사양식 = undefined;
          복사팝업열림 = false;
        },
      });
    } catch (err) {
      console.error("복사 실패", err);
    }
  }

  async function erp_copy(api = false) {
    let 전표담당자명 = "";
    const 전표담당자입력 = await Swal.fire({
      title: "전표에 삽입할 담당자 이름을 입력하세요.",
      input: "text",
      showCancelButton: true,
      confirmButtonText: "확인",
      cancelButtonText: "취소",
      inputValidator: value => {
        if (!value) return "전표에 삽입할 담당자 이름을 입력하세요!";
      },
      preConfirm: text => {
        전표담당자명 = text;
      },
    });

    if (전표담당자명) {
      const inputOptions = {
        인천: "인천",
        링고: "위탁(링고)",
        소리: "위탁(소리샵)",
        숲레: "위탁(숲레코드)",
        사랩: "위탁(사운드랩스)",
        하엔: "위탁(하이엔드오디오)",
      };
      const 출하창고 = await Swal.fire({
        title: "출하창고를 선택하세요",
        input: "radio",
        inputOptions,
        confirmButtonText: "선택 (더블클릭 쌉가능)",
        inputValidator: value => {
          if (!value) return "출하창고를 선택해야 합니다!";
        },
        didOpen: () => {
          document.querySelector(".swal2-radio label input")?.addEventListener("dblclick", () => {
            (document.querySelector(".swal2-confirm") as HTMLButtonElement).click();
          });
          document.querySelector(".swal2-radio label span")?.addEventListener("dblclick", () => {
            (document.querySelector(".swal2-confirm") as HTMLButtonElement).click();
          });
        },
      });
      if (출하창고.value) {
        console.log(전표담당자명);
        if (api) {
          let bulkDatas = new Array();
          for (let i = 0; i < 품목리스트.length; i++) {
            bulkDatas.push({
              BulkDatas: {
                UPLOAD_SER_NO: "1",
                CUST: 사업자등록번호?.replaceAll("-", ""),
                EMP_CD: 전표담당자명,
                WH_CD: 출하창고.value,
                U_MEMO2: 배송형태 == "방문수령" ? "오부장님 용산 수령" : (document.querySelector("#type") as HTMLInputElement).value,
                PROD_CD: 품목리스트[i].productInfo.PROD_CD,
                PROD_DES: 품목리스트[i].productInfo.product,
                SIZE_DES: (품목리스트[i].productInfo.itemType == 1 ? "DEMO 40%" : 품목리스트[i].productInfo.itemType == 2 ? "DEMO 50%" : "") + (품목리스트[i].productInfo.prop && ", " + 품목리스트[i].productInfo.prop),
                QTY: 품목리스트[i].productInfo.qty,
                PRICE: Number(품목리스트[i].productInfo.dome_price ?? 0 / 1.1).toFixed(5),
                SUPPLY_AMT: Number(품목리스트[i].productInfo.total_dome ?? 0 / 1.1).toFixed(5),
                VAT_AMT: Number(품목리스트[i].productInfo.dome_price ?? 0) - Number(Number(품목리스트[i].productInfo.dome_price ?? 0 / 1.1).toFixed(5)),
                REMARKS: 배송형태 == "대리배송" ? 품목리스트[i].deliveryInfo.name : "",
              },
            });
          }
          if (배송형태 == "대리배송") {
            bulkDatas.push({
              BulkDatas: {
                UPLOAD_SER_NO: "1",
                CUST: 사업자등록번호?.replaceAll("-", ""),
                EMP_CD: 전표담당자명,
                WH_CD: 출하창고.value,
                U_MEMO2: 배송형태,
                PROD_CD: "shipping1",
                PROD_DES: "[택배비]",
                QTY: 품목리스트.length,
                PRICE: 5454.545454,
                SUPPLY_AMT: Number((6000 / 1.1).toFixed(0)) * 품목리스트.length,
                VAT_AMT: (6000 - Number((6000 / 1.1).toFixed(0))) * 품목리스트.length,
                REMARKS: "",
              },
            });
          }
          const erpData = {
            SaleOrderList: bulkDatas,
          };
          fetch("/page/save_saleorder.php?v2=true", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(erpData),
          })
            .then(async response => {
              try {
                const data = await response.json();
                return data;
              } catch (error) {
                const text = await response.text();
                throw new Error(`JSON 파싱 실패: ${text}`);
              }
            })
            .then(result => {
              if (result.status == "success" && result.data.Status == "200" && result.data.Data.FailCnt == 0) {
                Swal.fire({
                  icon: "success",
                  title: "작업 성공",
                  html: `
											<code>${JSON.stringify(result.data.Data)}</code>
											<hr />
											<p>해당 발주서를 <strong>[접수]</strong> 처리하시겠습니까?</p>`,
                  showCancelButton: true,
                  confirmButtonText: "접수 처리",
                  cancelButtonText: "아니오",
                }).then(result => {
                  if (result.isConfirmed) {
                    //@ts-ignore
                    const apiLocation = window.getAPILocation && window.getAPILocation();
                    location.href = apiLocation;
                  }
                });
              } else if (result.status == "success" && result.data.Status == "200" && result.data.Data.FailCnt != 0) {
                Swal.fire({
                  icon: "error",
                  title: "일부 작업 실패",
                  html: `<code>${JSON.stringify(result.data.Data.ResultDetails)}</code>`,
                });
              } else {
                Swal.fire({
                  icon: "error",
                  title: "요청 실패",
                  html: `<code>${JSON.stringify(result)}</code>`,
                });
              }
            })
            .catch(error => {
              console.error("에러 발생:", error.message);
            });
        } else {
          let today = new Date();
          let 복사양식 = 품목리스트.reduce((acc, cur) => {
            return (
              acc +
              "\n" +
              [
                today.getFullYear().toString() + (today.getMonth() + 1).toString().padStart(2, "0") + today.getDate().toString().padStart(2, "0"), // date
                1, // order
                사업자등록번호?.replaceAll("-", ""), // code
                전표담당자명, // manager
                출하창고.value, // warehouse
                ,
                ,
                // type
                // project
                배송형태 == "방문수령" ? "오부장님 용산 수령" : 배송형태, // deliver
                ,
                ,
                ,
                // currency
                // exchange_rate
                // payment
                cur.productInfo.PROD_CD, // prod_cd
                cur.productInfo.product, // prod_des
                (cur.productInfo.itemType == 1 ? "DEMO 40%" : cur.productInfo.itemType == 2 ? "DEMO 50%" : "") + cur.productInfo.prop && ", " + cur.productInfo.prop, // prod_size
                ,
                // prod_serial
                cur.productInfo.qty, // prod_count
                Number(cur.productInfo.dome_price ?? 0 / 1.1).toFixed(5), // prod_price
                0, // prod_curr_price
                Number(cur.productInfo.total_dome ?? 0 / 1.1).toFixed(5), // prod_sup_price
                Number(cur.productInfo.dome_price ?? 0) - Number(Number(cur.productInfo.dome_price ?? 0 / 1.1).toFixed(5)), // prod_vat
                배송형태 == "대리배송" ? cur.deliveryInfo.name : "",
              ].join("\t")
            );
          }, "");
          if (배송형태 == "대리배송") {
            복사양식 =
              복사양식 +
              "\n" +
              [
                today.getFullYear().toString() + (today.getMonth() + 1).toString().padStart(2, "0") + today.getDate().toString().padStart(2, "0"), // date
                1, // order
                사업자등록번호?.replaceAll("-", ""), // code
                전표담당자명, // manager
                출하창고.value, // warehouse
                ,
                ,
                // type
                // project
                "대리배송", // deliver
                ,
                ,
                ,
                // currency
                // exchange_rate
                // payment
                "shipping1", // prod_cd
                "[택배비]", // prod_des
                ,
                ,
                // prod_size
                // prod_serial
                품목리스트.length, // prod_count
                "5,454.545454", // prod_price
                0, // prod_curr_price
                Number((6000 / 1.1).toFixed(0)) * 품목리스트.length, // prod_sup_price
                (6000 - Number((6000 / 1.1).toFixed(0))) * 품목리스트.length, // prod_vat
                "",
              ].join("\t");
            setTimeout(function () {
              navigator.clipboard
                .writeText(복사양식)
                .then(() => {
                  Swal.fire({
                    title: "웹자료 올리기 데이터가 복사되었습니다",
                    html: "이카운트 > 주문서입력 > 웹자료올리기 버튼을 누르고<br />첫번째 칸에 붙여넣으세요.",
                    confirmButtonText: "닫기",
                    icon: "success",
                    timer: 5000,
                    timerProgressBar: true,
                  });
                })
                .catch(err => {
                  Swal.fire({
                    title: "복사에 실패했습니다",
                    html: "사유: <br />" + err,
                    confirmButtonText: "닫기",
                    icon: "error",
                  });
                });
            }, 300);
          }
        }
      }
    }
  }

  const isHTMLElement = (element: any) => element instanceof HTMLElement || element instanceof HTMLInputElement;

  onMount(async () => {
    배송형태 = "대리배송";
    //@ts-ignore
    if (window.getDeliveryType) 배송형태 = window.getDeliveryType();

    //@ts-ignore
    if (window.getExistingData) 품목리스트 = [...품목리스트, ...window.getExistingData()];

    //@ts-ignore
    if (window.getOrderType) 발주서상태 = window.getOrderType();

    //@ts-ignore
    if (window.getAdmin) 어드민 = window.getAdmin();

    //@ts-ignore
    if (window.getMemberName) 작성자 = window.getMemberName();
    작성자 = "사운드캣";

    //@ts-ignore
    if (window.getOrderProductType) 발주제품군 = window.getOrderProductType();
    발주제품군 = "프로오디오";

    //@ts-ignore
    if (window.getChangeSaupja) 사업자변경 = window.getChangeSaupja();
    사업자변경 = true;

    //@ts-ignore
    if (window.getSaupja) [사업자명, 사업자등록번호] = window.getSaupja();
    사업자명 = "페이퍼컴퍼니";
    사업자등록번호 = "123-412-341234";
  });

  $effect(() => {
    //@ts-ignore
    if (품목리스트 && window.setData) window.setData(품목리스트);
  });
</script>

<div
  class="app_container"
  bind:this={컨테이너}>
  <div class="order_info app_row">
    <div
      class="app_col"
      style="--flex-basis: 20%;">
      <div>
        <label
          for="delivery_type"
          class="app_label block">배송형태</label>
      </div>
      <input
        type="text"
        id="delivery_type"
        value={배송형태}
        readonly />
    </div>
    <div
      class="app_col"
      style="--flex-basis: 20%;">
      <div>
        <label
          for="order_type"
          class="app_label block">발주제품군</label>
      </div>
      <input
        type="text"
        id="order_type"
        value={발주제품군}
        readonly />
    </div>
    <div
      class="app_col"
      style="--flex-basis: 20%;">
      <div>
        <label
          for="change_saupja"
          class="app_label block">사업자등록번호 변경</label>
      </div>
      <input
        type="checkbox"
        id="change_saupja"
        value={사업자변경}
        disabled />
    </div>
    <div
      class="app_col"
      style="--flex-basis: 20%;">
      <div>
        <label
          for="saupjamyeong"
          class="app_label block">사업자명</label>
      </div>
      <input
        type="text"
        id="saupjamyeong"
        value={사업자명}
        readonly />
    </div>
    <div
      class="app_col"
      style="--flex-basis: 20%;">
      <div>
        <label
          for="saupja"
          class="app_label block">사업자등록번호</label>
      </div>
      <input
        type="text"
        id="saupja"
        value={사업자등록번호}
        readonly />
    </div>
  </div>
  <div class="prod_list">
    {#each 품목리스트 as 품목, 인덱스 (품목.uuid)}
      <div
        class="prod_item"
        class:editable={품목.editable}
        class:finished={품목.finished}
        transition:fly={{ y: -10, duration: 100 }}>
        <div class="app_header">
          <button
            type="button"
            class="arcodian"
            onclick={() => (품목.collapsed = !품목.collapsed)}
            aria-label="품목 접기/펼치기"
            title="품목 접기/펼치기">{@html 품목.collapsed ? `<i class="fas fa-chevron-right"></i>` : `<i class="fas fa-chevron-down"></i>`}</button>
          <span><strong>품목{인덱스 + 1}</strong></span>
          <div class="radio_vertical">
            <label class="app_radio">
              <input
                type="radio"
                id="id_{인덱스}_itemType1"
                name="itemType_{인덱스}"
                value={0}
                bind:group={품목.productInfo.itemType}
                disabled />
              <span>일반</span>
            </label>
            <label class="app_radio">
              <input
                type="radio"
                id="id_{인덱스}_itemType2"
                name="itemType_{인덱스}"
                value={1}
                bind:group={품목.productInfo.itemType}
                disabled />
              <span>데모(40%)</span>
            </label>
            <label class="app_radio">
              <input
                type="radio"
                id="id_{인덱스}_itemType3"
                name="itemType_{인덱스}"
                value={2}
                bind:group={품목.productInfo.itemType}
                disabled />
              <span>데모(50%)</span>
            </label>
          </div>
          <div class="gap">&nbsp;</div>
          <div class="action">
            <label for="임시편집_{인덱스}"
              ><input
                type="checkbox"
                id="임시편집_{인덱스}"
                onchange={() => (품목.editable = !품목.editable)} /> 임시편집</label>
            <label for="출고처리_{인덱스}"
              ><input
                type="checkbox"
                id="출고처리_{인덱스}"
                onchange={() => {
                  품목.finished = !품목.finished;
                  if (어드민) 품목.collapsed = 품목.finished;
                }} /> 출고처리</label>
          </div>
        </div>
        {#if !품목.collapsed}
          <div
            class="app_body"
            transition:fly={{ y: -10, duration: 100 }}>
            {#if 배송형태 && ["대리배송", "익일수령택배", "퀵착불"].includes(배송형태)}
              <div class="deliveryInfo app_row">
                <div
                  class="app_col"
                  style="--flex-basis: 33%;">
                  <div>
                    <label
                      for="id_{인덱스}_name"
                      class="app_label block">고객명</label>
                  </div>
                  <input
                    type="text"
                    id="id_{인덱스}_name"
                    bind:value={품목.deliveryInfo.name}
                    readonly={!품목.editable} />
                </div>
                <div
                  class="app_col"
                  style="--flex-basis: 33%;">
                  <div>
                    <label
                      for="id_{인덱스}_hp1"
                      class="app_label block">전화번호1</label>
                  </div>
                  <input
                    type="text"
                    id="id_{인덱스}_hp1"
                    bind:value={품목.deliveryInfo.hp1}
                    readonly={!품목.editable} />
                </div>
                <div
                  class="app_col"
                  style="--flex-basis: 33%;">
                  <div>
                    <label
                      for="id_{인덱스}_hp2"
                      class="app_label block">전화번호2</label>
                  </div>
                  <input
                    type="text"
                    id="id_{인덱스}_hp2"
                    bind:value={품목.deliveryInfo.hp2}
                    readonly={!품목.editable} />
                </div>
                <div
                  class="app_col"
                  style="--flex-basis: 100%;">
                  <div class="app_label block">
                    <span style="margin-right: 0.5em">주소</span>
                    <button onclick={() => 배송정보복사(품목)}>배송정보 복사</button>
                  </div>
                </div>
                <div
                  class="app_col"
                  style="--flex-basis: 50%">
                  <input
                    type="text"
                    placeholder="우편번호"
                    bind:value={품목.deliveryInfo.postcode}
                    readonly={!품목.editable} />
                </div>
                <div
                  class="app_col"
                  style="--flex-basis: 50%">
                  <input
                    type="text"
                    placeholder="배송메시지"
                    bind:value={품목.deliveryInfo.msg}
                    readonly={!품목.editable} />
                </div>
                <div
                  class="app_col"
                  style="--flex-basis: 100%">
                  <input
                    type="text"
                    placeholder="기본주소"
                    bind:value={품목.deliveryInfo.addr1}
                    readonly={!품목.editable} />
                </div>
                <div
                  class="app_col"
                  style="--flex-basis: 50%">
                  <input
                    type="text"
                    placeholder="상세주소"
                    bind:value={품목.deliveryInfo.addr2}
                    readonly={!품목.editable} />
                </div>
                <div
                  class="app_col"
                  style="--flex-basis: 50%">
                  <input
                    type="text"
                    placeholder="참고항목"
                    bind:value={품목.deliveryInfo.addr3}
                    readonly={!품목.editable} />
                </div>
              </div>
              <hr />
            {/if}
            <div class="prodInfo app_row">
              <div
                class="app_col"
                style="--flex-basis: 20%;">
                <div>
                  <label
                    for="id_{인덱스}_brand"
                    class="app_label block">브랜드</label>
                </div>
                <input
                  type="text"
                  class="noteditable"
                  id="id_{인덱스}_brand"
                  bind:value={품목.productInfo.brand}
                  readonly />
              </div>
              <div
                class="app_col"
                style="--flex-basis: {품목.productInfo.useprop || 품목.productInfo.PROD_CD == 'etc_001' ? '40' : '80'}%;">
                <div>
                  <label
                    for="id_{인덱스}_product"
                    class="app_label block">품목명</label>
                </div>
                <input
                  type="text"
                  class="noteditable"
                  id="id_{인덱스}_product"
                  bind:value={품목.productInfo.product}
                  readonly />
              </div>
              {#if 품목.productInfo.useprop || 품목.productInfo.PROD_CD == "etc_001"}
                <div
                  class="app_col"
                  style="--flex-basis: 40%;">
                  <div>
                    <label
                      for="id_{인덱스}_prop"
                      class="app_label block">옵션</label>
                  </div>
                  <input
                    type="text"
                    id="id_{인덱스}_prop"
                    bind:value={품목.productInfo.prop} />
                </div>
              {/if}
              <div
                class="app_col"
                style="--flex-basis: 20%;">
                <div>
                  <label
                    for="id_{인덱스}_sell_price"
                    class="app_label block">소비자가</label>
                </div>
                <div
                  class="app_text_input"
                  data-label="원">
                  <input
                    type="text"
                    id="id_{인덱스}_sell_price"
                    value={new Intl.NumberFormat("ko-KR").format(Number(품목.productInfo.sell_price))}
                    oninput={e => {
                      가격계산(e, 품목, "소비자가");
                    }}
                    readonly={!품목.editable} />
                </div>
              </div>
              <div
                class="app_col"
                style="--flex-basis: 20%;">
                <div>
                  <label
                    for="id_{인덱스}_dome_price"
                    class="app_label block">공급단가</label>
                </div>
                <div
                  class="app_text_input"
                  data-label="원">
                  <input
                    type="text"
                    id="id_{인덱스}_dome_price"
                    value={new Intl.NumberFormat("ko-KR").format(Number(품목.productInfo.dome_price))}
                    oninput={e => {
                      가격계산(e, 품목, "공급단가");
                    }}
                    readonly={!품목.editable} />
                </div>
              </div>
              <div
                class="app_col"
                style="--flex-basis: 10%;">
                <div>
                  <label
                    for="id_{인덱스}_qty"
                    class="app_label block">수량</label>
                </div>
                <div
                  class="app_text_input"
                  data-label="개">
                  <input
                    type="text"
                    class="app_text_input"
                    data-label="개"
                    id="id_{인덱스}_qty"
                    value={new Intl.NumberFormat("ko-KR").format(Math.floor(Number(품목.productInfo.qty)))}
                    oninput={e => {
                      가격계산(e, 품목, "수량");
                    }}
                    readonly={!품목.editable} />
                </div>
              </div>
              <div
                class="app_col"
                style="--flex-basis: 10%;">
                <div>
                  <label
                    for="id_{인덱스}_margin"
                    class="app_label block">마진(%)</label>
                </div>
                <input
                  type="text"
                  id="id_{인덱스}_margin"
                  value={new Intl.NumberFormat("ko-KR").format(Number(품목.productInfo.margin))}
                  oninput={e => {
                    가격계산(e, 품목, "마진");
                  }}
                  readonly={!품목.editable} />
              </div>
              <div
                class="app_col"
                style="--flex-basis: 40%;">
                <div>
                  <label
                    for="id_{인덱스}_total_dome"
                    class="app_label block">공급합계</label>
                </div>
                <div
                  class="app_text_input"
                  data-label="원">
                  <input
                    type="text"
                    id="id_{인덱스}_total_dome"
                    value={new Intl.NumberFormat("ko-KR").format(Number(품목.productInfo.total_dome))}
                    readonly />
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
  <div class="app_footer app_row">
    <div
      class="app_col"
      style="display: flex; align-items:center; justify-content: flex-end;">
      <div style="margin: 0; padding: 0.5em 0.5em calc(0.5em - 1px); border: 1px solid #ddd; border-right: none; box-sizing: border-box; background: #eee; border-radius: 4px 0 0 4px">총합계</div>
      <div
        class="app_text_input"
        data-label="원">
        <input
          style="margin: 0; width: unset; border: 1px solid #ddd; border-radius: 0 4px 4px 0"
          type="text"
          readonly
          value={new Intl.NumberFormat("ko-KR").format(
            품목리스트.reduce((val, x) => {
              return val + (x.productInfo.total_dome ?? 0);
            }, 0)
          )} />
      </div>
    </div>
    <div style="text-align: right">
      {#if 어드민}
        <button onclick={() => 배송정보복사(품목리스트)}>배송정보 모두 복사</button>
        <button onclick={() => erp_copy()}>ERP 웹자료 올리기 양식 복사</button>
        <button onclick={() => erp_copy(true)}>ERP 주문서 바로 작성</button>
      {/if}
    </div>
  </div>
</div>
{#if 복사팝업열림}
  <Portal target=".copied">
    <p>배송 정보 입력 시트 첫번째 열을 선택하고 붙여넣으시면 됩니다.</p>
    <p>&nbsp;</p>
    <details>
      <summary>자세히보기</summary>
      <pre style="white-space: pre-wrap;"><code>{복사양식 && 복사양식.replaceAll("\t", " ")}</code></pre>
    </details>
    <p>&nbsp</p>
    <p style="text-align:center">
      <img
        alt="복사예제"
        src={copyExample}
        style="width:100%" />
    </p></Portal>
{/if}

<style>
  :global(.soldoutDialog p) {
    margin: 0;
    margin-bottom: 1em;
  }
  .block {
    display: block;
  }
  .gap {
    flex-grow: 1;
  }

  .app_label {
    font-weight: bolder;
    margin: 0.5em 0;
  }

  .prod_item {
    border: 1px solid #ddd;
    transition: 0.2s;
  }

  @keyframes editable_active {
    0% {
      background: yellow;
    }
    100% {
      background: rgb(220, 243, 255);
    }
  }

  .prod_item.editable input:not(.noteditable) {
    animation: editable_active 0.3s linear 0s;
    animation-fill-mode: forwards;
    animation-iteration-count: 1;
  }

  .prod_item.finished {
    filter: brightness(0.8);
    background: #0003;
  }

  .app_header {
    display: flex;
    align-items: center;
    gap: 1em;
    padding: 1em;
    background-color: #eee;
    border-bottom: 1px solid #ddd;
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .radio_vertical {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1em;
  }

  .app_radio {
    display: inline-flex;
    align-items: center;
    position: relative;
    font-weight: bolder;
  }
  .app_radio span {
    margin-top: auto;
  }

  .app_radio input[type="radio"] {
    width: 0;
    height: 0;
    margin: 0;
    padding: 0;
  }
  .app_radio:has(input[type="radio"])::before {
    content: "";
    box-sizing: content-box;
    border-radius: 999px;
    display: inline-block;
    width: 1em;
    height: 1em;
    margin-right: 0.3em;
    border: 2px solid #0002;
    background: white;
    transition: 0.1s;
  }
  .app_radio:has(input[type="radio"]):hover::before {
    border-color: #0004;
  }
  .app_radio:has(input[type="radio"]):active::before {
    transition: 0s;
    background: #0002;
  }
  .app_radio:has(input[type="radio"]:checked)::before {
    border-color: rgb(0, 109, 211);
  }

  .app_radio:has(input[type="radio"])::after {
    content: "";
    box-sizing: content-box;
    border-radius: 999px;
    width: calc(1em - 4px);
    height: calc(1em - 4px);
    position: absolute;
    left: 4px;
    transition: 0.1s;
  }
  .app_radio:has(input[type="radio"]:checked)::after {
    background: rgb(0, 109, 211);
  }

  .app_text_input {
    position: relative;
  }
  .app_text_input input[type="text"] {
    padding-right: 2.2em;
    text-align: right;
  }
  .app_text_input::after {
    content: attr(data-label);
    position: absolute;
    padding: 0.5em;
    right: 0;
    top: 0;
    border: 1px solid transparent;
    border-left: 1px solid #0002;
    box-sizing: border-box;
    background: #0001;
    border-radius: 0 6px 6px 0;
  }

  .app_body {
    padding: 1em;
  }

  .app_row {
    display: flex;
    flex-wrap: wrap;
    column-gap: 1em;
  }

  .app_row .app_col {
    flex: 1 1 100%;
    flex-basis: calc(var(--flex-basis) - 1em);
  }

  input {
    box-sizing: border-box;
    border-color: #ddd;
    border-style: solid;
    border-width: 1px;
    border-radius: 4px;
  }

  input[type="text"] {
    width: 100%;
    margin-bottom: 1em;
    font-size: 1em;
    padding: 0.5em;
  }

  hr {
    border: none;
    border-top: 1px solid #ddd;
  }

  .app_footer {
    display: flex;
    flex-direction: row-reverse;
    align-items: center;
    margin-top: 1em;
    gap: 1em;
  }

  button {
    font-size: 1em;
    padding: 0.5em;
    box-sizing: border-box;
    border: 1px solid rgb(180, 186, 194);
    border-radius: 4px;
    background-color: rgb(233, 235, 237);
  }
  button:hover {
    background: rgb(208, 215, 223);
  }
  button:active {
    background: rgb(151, 160, 170);
  }

  @media screen and (max-width: 640px) {
    .app_row .app_col {
      flex-basis: 100%;
    }
  }
</style>
