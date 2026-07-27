 

  function resizeGridItem(item, gridClassName, itemWrapperSelector){
    let grid = document.getElementsByClassName(gridClassName)[0];
    let rowHeight = parseInt(window.getComputedStyle(grid).getPropertyValue('grid-auto-rows'));
    let rowGap = parseInt(window.getComputedStyle(grid).getPropertyValue('grid-row-gap'));
    let rowSpan = Math.ceil((item.querySelector(itemWrapperSelector).getBoundingClientRect().height+rowGap)/(rowHeight+rowGap));
    item.style.gridRowEnd = "span "+rowSpan;
  }

  function resizeAllGridItems(itemClassName, gridClassName, itemWrapperSelector){
    let allItems = document.getElementsByClassName(itemClassName);
    for(let x=0;x<allItems.length;x++){
       resizeGridItem(allItems[x], gridClassName, itemWrapperSelector);
    }
  }

  export { resizeAllGridItems }