document.addEventListener('DOMContentLoaded', () => {
  const prompts=[...document.querySelectorAll('article pre')];
  for(const pre of prompts) {
    if(pre.parentElement?.classList.contains('prompt-wrap')) continue;
    const wrapper=document.createElement('div');
    wrapper.className='prompt-wrap';
    pre.replaceWith(wrapper);
    wrapper.append(pre);
    const button=document.createElement('button');
    button.type='button';
    button.className='copy-prompt';
    button.textContent='Копировать';
    button.setAttribute('aria-label','Копировать пример или промпт');
    button.addEventListener('click',async()=>{
      const value=pre.textContent;
      try {
        await navigator.clipboard.writeText(value);
        button.textContent='Скопировано ✓';
      } catch {
        const selection=window.getSelection();
        const range=document.createRange();
        range.selectNodeContents(pre);
        selection?.removeAllRanges();
        selection?.addRange(range);
        button.textContent='Выделено — нажмите «Копировать»';
      }
    });
    wrapper.append(button);
  }
});