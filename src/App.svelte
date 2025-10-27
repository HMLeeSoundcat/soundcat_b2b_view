<script module>
  declare const Swal: typeof SwalType;
</script>

<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { parseExcelWithWorker } from "./lib/parseExcel";
  import type SwalType from "sweetalert2";
  import Portal from "svelte-portal";

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

  type 개별품목정보 = {
    brand: string | undefined;
    brand_kor: string | undefined;
    PROD_CD: string | undefined;
    product: string | undefined;
    carton: string | undefined;
    price: string | undefined;
    software: string | undefined;
    bypass_soldout: string | undefined;
    soldout: string | undefined;
    fixed_stock: string | undefined;
    custom_option: string | undefined;
    add_date: string | undefined;
    whitelist_user: string | undefined;
    blacklist_user: string | undefined;
    zerostock: number | undefined;
    stock_level: number | undefined;
  };

  type 임시배열타입 = {
    product: string | undefined;
    PROD_CD: string | undefined;
    brand: string | undefined;
    soldout: number | undefined;
    software: string | undefined;
  };

  let 발주서상태: string = $state("대기");
  let 컨테이너 = $state();

  const 배송형태종류 = ["익일수령택배", "방문수령", "퀵착불", "퀵선불", "대리배송", "전자배송", ""] as const;
  let 배송형태: 배송형태종류타입 | undefined = $state();

  let 품목리스트: 품목리스트항목타입[] = $state(샘플데이터);

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

  const isHTMLElement = (element: any) => element instanceof HTMLElement || element instanceof HTMLInputElement;

  onMount(async () => {
    //@ts-ignore
    if (window.getExistingData) 품목리스트 = [...품목리스트, ...window.getExistingData()];

    //@ts-ignore
    if (window.getDefaultAddr) 기본주소 = window.getDefaultAddr();
    //@ts-ignore
    if (window.getOrderType) 발주서상태 = window.getOrderType();
  });

  $effect(() => {
    //@ts-ignore
    if (품목리스트 && window.setData) window.setData(품목리스트);
  });
</script>

<div
  class="app_container"
  bind:this={컨테이너}>
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
                readonly />
              <span>일반</span>
            </label>
            <label class="app_radio">
              <input
                type="radio"
                id="id_{인덱스}_itemType2"
                name="itemType_{인덱스}"
                value={1}
                bind:group={품목.productInfo.itemType}
                readonly />
              <span>데모(40%)</span>
            </label>
            <label class="app_radio">
              <input
                type="radio"
                id="id_{인덱스}_itemType3"
                name="itemType_{인덱스}"
                value={2}
                bind:group={품목.productInfo.itemType}
                readonly />
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
                onchange={() => (품목.finished = !품목.finished)} /> 출고처리</label>
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
                    readonly />
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
                    readonly />
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
                    readonly />
                </div>
                <div
                  class="app_col"
                  style="--flex-basis: 100%;">
                  <div class="app_label block">
                    <span style="margin-right: 0.5em">주소</span>
                  </div>
                </div>
                <div
                  class="app_col"
                  style="--flex-basis: 50%">
                  <input
                    type="text"
                    placeholder="우편번호"
                    bind:value={품목.deliveryInfo.postcode}
                    readonly />
                </div>
                <div
                  class="app_col"
                  style="--flex-basis: 50%">
                  <input
                    type="text"
                    placeholder="배송메시지"
                    bind:value={품목.deliveryInfo.msg}
                    readonly />
                </div>
                <div
                  class="app_col"
                  style="--flex-basis: 100%">
                  <input
                    type="text"
                    placeholder="기본주소"
                    bind:value={품목.deliveryInfo.addr1}
                    readonly />
                </div>
                <div
                  class="app_col"
                  style="--flex-basis: 50%">
                  <input
                    type="text"
                    placeholder="상세주소"
                    bind:value={품목.deliveryInfo.addr2}
                    readonly />
                </div>
                <div
                  class="app_col"
                  style="--flex-basis: 50%">
                  <input
                    type="text"
                    placeholder="참고항목"
                    bind:value={품목.deliveryInfo.addr3}
                    readonly />
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
                  placeholder="브랜드"
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
                    class="app_label block">품목명 <span style="font-weight:normal; font-size: 0.9em">(찾는 품목이 없는 경우 선택 없이 진행 가능)</span></label>
                </div>
                <input
                  type="text"
                  placeholder="브랜드를 선택하지 않아도 품목 선택 가능"
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
    <div style="text-align: right"></div>
  </div>
</div>

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
  }

  @keyframes editable_active {
    0% {
      background: yellow;
    }
    100% {
      background: rgb(220, 243, 255);
    }
  }

  .prod_item.editable input {
    animation: editable_active 0.3s linear 0s;
    animation-fill-mode: forwards;
    animation-iteration-count: 1;
  }

  .prod_item.finished {
    filter: brightness(0.7);
    background: #0005;
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
