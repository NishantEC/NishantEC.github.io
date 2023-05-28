import React from "react";
import "./focusedText.scss";

type Props = {
  text: String;
};

const FocusedText = ({ text }: Props) => {
  const words: any = text.split(" ");

  // const splitText = (word) => {
  //     const wordSplit = word.split("");
  //     const boldTo = Math.ceil(word.length / 2);

  //     const editedWord =
  //     `<b>${wordSplit.slice(0,boldTo).join("")}
  //     </b>${wordSplit.slice(boldTo,word.length).join("")} `;

  //     return editedWord;

  // }

  const wordBold = (word: any) => {
    const wordSplit = word.split("");
    const boldTo = Math.ceil(word.length / 2);
    // return (
    //     <>
    // <br>{wordSplit.slice(0,boldTo).join("")}</br>
    // {wordSplit.slice(boldTo,word.length).join("")}
    //     </>
    // )
    return {
      bold: wordSplit.slice(0, boldTo).join(""),
      normal: wordSplit.slice(boldTo, word.length).join(""),
    };
  };
  return (
    <div>
      <div className="words-wrapper">
        {words.map((word: any, index: any) => {
          return (
            <span key={index}>
              <span className="boldText">{wordBold(word).bold}</span>
              <span className="normalText">{wordBold(word).normal}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default FocusedText;
