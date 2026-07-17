export const formatDate = (
  date
) => {

  return new Date(
    date
  ).toLocaleDateString();
};


export const calculateCompletionRate =
  (
    completed,
    total
  ) => {

    if (total === 0) {

      return 0;
    }

    return (
      (completed / total) * 100
    ).toFixed(2);
};


export const truncateText = (
  text,
  limit = 50
) => {

  if (text.length > limit) {

    return (
      text.substring(0, limit) +
      "..."
    );
  }

  return text;
};