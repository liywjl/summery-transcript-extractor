import { icon, type IconName } from "../icons";

type Child = Node | string | undefined | false;

type Props = {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
  data?: Record<string, string>;
};

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (props.className) {
    element.className = props.className;
  }

  if (props.text !== undefined) {
    element.textContent = props.text;
  }

  Object.entries(props.attrs ?? {}).forEach(([name, value]) => element.setAttribute(name, value));
  Object.assign(element.dataset, props.data ?? {});
  element.append(...children.filter((child): child is Node | string => Boolean(child)));

  return element;
}

export function iconElement(name: IconName): Element {
  const template = document.createElement("template");
  template.innerHTML = icon(name);

  return template.content.firstElementChild!;
}

export function setButtonContent(button: HTMLButtonElement, iconName: IconName, label?: string): void {
  button.replaceChildren(iconElement(iconName), ...(label ? [label] : []));
}

export function iconButton(iconName: IconName, label: string, onClick: () => void, className = "icon-button"): HTMLButtonElement {
  const button = h("button", { className, attrs: { type: "button", "aria-label": label, title: label } }, iconElement(iconName));
  button.addEventListener("click", onClick);

  return button;
}

export function textButton(className: string, iconName: IconName, label: string, onClick: () => void): HTMLButtonElement {
  const button = h("button", { className, attrs: { type: "button" } }, iconElement(iconName), label);
  button.addEventListener("click", onClick);

  return button;
}
